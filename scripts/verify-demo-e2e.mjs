#!/usr/bin/env node
/**
 * End-to-end verification of `agent-eslint-config` against the `demo/` consumer,
 * across the FULL restructured fixture set (`demo/fixtures/<group>/{good,bad}.ts`
 * plus the filename-demo `demo/fixtures/naming/util-named.bad.ts`).
 *
 * Ordered, fail-loud pipeline (each stage throws → non-zero exit on any failure):
 *   1. Rebuild the root package FIRST, so a stale `dist/` can never mask a
 *      regression in what consumers actually import.
 *   2. `npm install --prefix demo` — resolve the `file:..` dependency plus the
 *      `eslint`/`typescript` peers into an isolated `demo/node_modules`.
 *   3. `tsc --noEmit` in `demo/` — prove the default import and its types resolve
 *      from the built `dist/` artifacts (type-resolution proof).
 *   4. Lint EVERY `<group>/good.ts` and assert ZERO problems (no errors, no
 *      warnings) — printing a per-file problem list on any failure.
 *   5. Lint EVERY `<group>/bad.ts` (plus `naming/util-named.bad.ts`) and assert —
 *      from the structured ESLint JSON, never the exit code alone — that ALL of
 *      the target rule IDs the manifest claims for that group are PRESENT
 *      (presence check; a bad.ts may legitimately emit extra incidental rules).
 *
 * SOURCE OF TRUTH for the expected group → rule-ID mapping is the manifest
 * `demo/fixtures/README.md`. Its "Groups → rule IDs asserted from bad.ts" table
 * is PARSED at runtime, so the expectations can never silently drift from the
 * manifest. The fixture group directories are additionally discovered from the
 * filesystem, so a newly-added group with no manifest entry is flagged loudly
 * rather than silently ignored.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demoDir = path.join(rootDir, 'demo')
const fixturesDir = path.join(demoDir, 'fixtures')
const manifestPath = path.join(fixturesDir, 'README.md')
const eslintBin = path.join(demoDir, 'node_modules', '.bin', 'eslint')
const tscBin = path.join(demoDir, 'node_modules', '.bin', 'tsc')

// The three custom rules this package ships. They are covered by their home
// groups' manifest entries (imports-alias / step-down / never-return); this
// list lets us re-assert explicitly that they stay enforced end-to-end.
const CUSTOM_RULE_IDS = [
  'step-down-rule/step-down',
  'alias/prefer-alias',
  'no-never-return/no-never-return-type',
]

/**
 * Extract every backtick-delimited token from a fragment of Markdown.
 *
 * @param text - the Markdown fragment
 * @returns the ordered list of tokens found between backticks
 */
function backtickTokens(text) {
  return [...text.matchAll(/`([^`]+)`/g)].map(match => match[1])
}

/**
 * Return the lines of a Markdown heading's section — everything after the
 * heading line until (but not including) the next heading of any level.
 *
 * @param lines - all lines of the document
 * @param headingSubstring - text that uniquely identifies the heading line
 * @returns the section body lines
 */
function sectionLines(lines, headingSubstring) {
  const start = lines.findIndex(line => line.trimStart().startsWith('#') && line.includes(headingSubstring))
  if (start === -1) {
    throw new Error(`Manifest is missing the "${headingSubstring}" heading — cannot derive expectations.`)
  }

  const body = lines.slice(start + 1)
  const nextHeading = body.findIndex(line => line.trimStart().startsWith('#'))
  return nextHeading === -1 ? body : body.slice(0, nextHeading)
}

/**
 * Split a Markdown table row into its trimmed cell values.
 *
 * @param row - a line beginning and ending with a pipe
 * @returns the interior cells, or null when the line is not a table row
 */
function tableCells(row) {
  if (!row.trimStart().startsWith('|')) {
    return null
  }
  return row.split('|').slice(1, -1).map(cell => cell.trim())
}

/**
 * Parse the manifest's "Groups → rule IDs" table into a mapping from the
 * bad-fixture file (relative to `demo/`) to the rule IDs it must emit.
 *
 * The group-directory cell may name a specific file in a second backtick token
 * (e.g. `naming/` (`util-named.bad.ts`)); otherwise the group's `bad.ts` is used.
 *
 * @param manifestText - the raw contents of `demo/fixtures/README.md`
 * @returns a Map from `fixtures/<group>/<file>` to its expected rule IDs
 */
function parseExpectedByBadFile(manifestText) {
  const lines = sectionLines(manifestText.split('\n'), 'Groups → rule IDs asserted')
  const expected = new Map()

  for (const line of lines) {
    const cells = tableCells(line)
    if (!cells) {
      continue
    }

    const groupTokens = backtickTokens(cells[0])
    if (groupTokens.length === 0) {
      continue // header or separator row
    }

    const group = groupTokens[0].replace(/\/$/, '')
    const fileName = groupTokens[1] ?? 'bad.ts'
    const ruleIds = backtickTokens(cells[1] ?? '')
    const relativeFile = `fixtures/${group}/${fileName}`

    if (ruleIds.length === 0) {
      throw new Error(`Manifest lists no asserted rule IDs for ${relativeFile}.`)
    }
    expected.set(relativeFile, ruleIds)
  }

  if (expected.size === 0) {
    throw new Error('Parsed zero group entries from the manifest — the table format may have changed.')
  }
  return expected
}

/**
 * Parse the manifest's "Intentionally NOT covered" table for informational
 * reporting only.
 *
 * @param manifestText - the raw contents of `demo/fixtures/README.md`
 * @returns the list of rule IDs the manifest documents as not covered
 */
function parseNotCovered(manifestText) {
  const lines = sectionLines(manifestText.split('\n'), 'Intentionally NOT covered')
  const ruleIds = []

  for (const line of lines) {
    const cells = tableCells(line)
    const tokens = cells ? backtickTokens(cells[0]) : []
    if (tokens.length > 0) {
      ruleIds.push(tokens[0])
    }
  }
  return ruleIds
}

/**
 * Walk the fixtures tree and classify every `.ts` fixture as a good (clean)
 * fixture or a bad (rule-violating) fixture, keyed by path relative to `demo/`.
 *
 * @returns `{ goodFiles, badFiles }`, each a sorted list of relative paths
 */
function discoverFixtures() {
  const groups = fs.readdirSync(fixturesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)

  const goodFiles = []
  const badFiles = []

  for (const group of groups) {
    for (const fileName of fs.readdirSync(path.join(fixturesDir, group))) {
      const relativeFile = `fixtures/${group}/${fileName}`
      if (fileName === 'good.ts' || fileName.endsWith('.good.ts')) {
        goodFiles.push(relativeFile)
      }
      else if (fileName === 'bad.ts' || fileName.endsWith('.bad.ts')) {
        badFiles.push(relativeFile)
      }
    }
  }

  return { goodFiles: goodFiles.sort(), badFiles: badFiles.sort() }
}

/**
 * Fail loudly if the discovered fixtures and the manifest have drifted apart:
 * every discovered bad fixture must have a manifest entry, and every manifest
 * entry must point at a fixture that exists on disk.
 *
 * @param badFiles - bad fixtures discovered on the filesystem
 * @param expected - the manifest mapping keyed by bad-fixture path
 */
function assertNoMappingDrift(badFiles, expected) {
  const unmapped = badFiles.filter(file => !expected.has(file))
  if (unmapped.length > 0) {
    throw new Error(`Fixture group(s) have no manifest mapping (add them to demo/fixtures/README.md):\n  - ${unmapped.join('\n  - ')}`)
  }

  const orphaned = [...expected.keys()].filter(file => !badFiles.includes(file))
  if (orphaned.length > 0) {
    throw new Error(`Manifest maps rule IDs to bad fixture(s) that do not exist on disk:\n  - ${orphaned.join('\n  - ')}`)
  }
}

/**
 * Lint a single file with the JSON formatter and return the parsed result for it.
 *
 * ESLint exits 1 when it reports problems (expected for `bad.ts`); only a fatal
 * run (exit code 2 / spawn error) or a fatal parse message is treated as a
 * pipeline failure — that is what would surface an always-on type-aware parser
 * error from a missing/unresolvable tsconfig.
 *
 * @param relativeFile - file to lint, relative to `demo/`
 * @returns the ESLint JSON result object for that file
 */
function lintFile(relativeFile) {
  const result = spawnSync(eslintBin, ['--format', 'json', relativeFile], { cwd: demoDir, encoding: 'utf8' })

  if (result.error) {
    throw new Error(`Failed to spawn ESLint for ${relativeFile}: ${result.error.message}`)
  }
  if (result.status === 2) {
    throw new Error(`ESLint run failed (config/fatal) for ${relativeFile}:\n${result.stderr}`)
  }

  const parsed = JSON.parse(result.stdout)
  const fileResult = parsed.find(entry => entry.filePath.endsWith(relativeFile.replace(/\//g, path.sep)))
  if (!fileResult) {
    throw new Error(`ESLint produced no result for ${relativeFile}. Was it silently ignored?\n${result.stdout}`)
  }

  const fatal = fileResult.messages.find(message => message.fatal)
  if (fatal) {
    throw new Error(`ESLint hit a fatal (parser) error on ${relativeFile}: ${fatal.message}`)
  }
  return fileResult
}

/**
 * Check a good fixture is completely clean — zero errors AND zero warnings.
 *
 * @param relativeFile - the good fixture path, relative to `demo/`
 * @returns a failure detail string when the file is not clean, otherwise null
 */
function checkGoodIsClean(relativeFile) {
  const good = lintFile(relativeFile)
  if (good.errorCount === 0 && good.warningCount === 0) {
    return null
  }

  const rendered = good.messages
    .map(message => `      - ${message.ruleId ?? '(no rule)'}: ${message.message} (line ${message.line})`)
    .join('\n')
  return `expected zero problems, got ${good.errorCount} error(s) / ${good.warningCount} warning(s):\n${rendered}`
}

/**
 * Check a bad fixture reports every rule ID the manifest claims for it, driven
 * off the structured JSON rule IDs (never the exit code alone).
 *
 * @param relativeFile - the bad fixture path, relative to `demo/`
 * @param expectedRuleIds - the rule IDs that MUST be present
 * @returns `{ reported, failure }` — the reported rule-ID set plus a failure
 *   detail string (or null when every expected rule ID is present)
 */
function checkBadTriggers(relativeFile, expectedRuleIds) {
  const bad = lintFile(relativeFile)
  const reported = new Set(bad.messages.map(message => message.ruleId).filter(Boolean))

  const missing = expectedRuleIds.filter(ruleId => !reported.has(ruleId))
  if (missing.length === 0) {
    return { reported, failure: null }
  }

  const failure = `missing expected rule ID(s):\n      - ${missing.join('\n      - ')}\n      (reported: ${[...reported].sort().join(', ') || 'none'})`
  return { reported, failure }
}

/**
 * Throw a single aggregated report if any fixture failed, so every failing
 * group is surfaced in one run rather than only the first.
 *
 * @param failures - collected `{ file, detail }` entries across all fixtures
 */
function reportFailuresAndExit(failures) {
  if (failures.length === 0) {
    return
  }

  const rendered = failures
    .map(failure => `  ✗ ${failure.file}: ${failure.detail}`)
    .join('\n')
  throw new Error(`E2E FAILED: ${failures.length} fixture(s) did not meet expectations:\n${rendered}`)
}

/**
 * Assert the three custom rules survived, both as manifest expectations and as
 * rule IDs actually observed across the linted bad fixtures.
 *
 * @param expectedUnion - union of all manifest-expected rule IDs
 * @param reportedUnion - union of all rule IDs reported across bad fixtures
 */
function assertCustomRulesEnforced(expectedUnion, reportedUnion) {
  const gaps = CUSTOM_RULE_IDS.filter(ruleId => !expectedUnion.has(ruleId) || !reportedUnion.has(ruleId))
  if (gaps.length > 0) {
    throw new Error(`Custom rule(s) no longer enforced end-to-end: ${gaps.join(', ')}`)
  }
}

/**
 * Run a command, streaming its output, and throw if it exits non-zero.
 *
 * @param label - human-readable stage name for the log
 * @param command - executable to run
 * @param args - arguments passed to the executable
 * @param cwd - working directory for the command
 */
function runStage(label, command, args, cwd) {
  console.log(`\n=== ${label} ===\n$ ${command} ${args.join(' ')}  (cwd: ${cwd})`)
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

runStage('1/5 rebuild root package (no stale dist)', 'npm', ['run', 'build'], rootDir)
runStage('2/5 install demo (file:.. + peers)', 'npm', ['install', '--prefix', demoDir, '--no-audit', '--no-fund'], rootDir)
runStage('3/5 typecheck demo (type-resolution proof)', tscBin, ['--noEmit'], demoDir)

const manifestText = fs.readFileSync(manifestPath, 'utf8')
const expectedByBadFile = parseExpectedByBadFile(manifestText)
const notCovered = parseNotCovered(manifestText)
const { goodFiles, badFiles } = discoverFixtures()

assertNoMappingDrift(badFiles, expectedByBadFile)

// Collect every failing fixture across ALL groups before reporting, so one
// broken group can never hide failures in a later one. Each entry is
// `{ file, detail }`; the run throws once, at the end, if any exist.
const failures = []

console.log(`\n=== 4/5 assert every good.ts is clean (0 errors / 0 warnings) ===`)
for (const relativeFile of goodFiles) {
  const detail = checkGoodIsClean(relativeFile)
  if (detail) {
    failures.push({ file: relativeFile, detail })
    console.log(`  FAIL ${relativeFile}`)
    continue
  }
  console.log(`  ok  ${relativeFile}`)
}

console.log(`\n=== 5/5 assert every bad.ts reports its target rule IDs ===`)
const reportedUnion = new Set()
const expectedUnion = new Set()
for (const relativeFile of badFiles) {
  const expectedRuleIds = expectedByBadFile.get(relativeFile)
  for (const ruleId of expectedRuleIds) {
    expectedUnion.add(ruleId)
  }

  const { reported, failure } = checkBadTriggers(relativeFile, expectedRuleIds)
  for (const ruleId of reported) {
    reportedUnion.add(ruleId)
  }

  if (failure) {
    failures.push({ file: relativeFile, detail: failure })
    console.log(`  FAIL ${relativeFile}`)
    continue
  }
  console.log(`  ok  ${relativeFile}  (${expectedRuleIds.length} rule ID(s) present)`)
}

reportFailuresAndExit(failures)
assertCustomRulesEnforced(expectedUnion, reportedUnion)

console.log('\n=== summary ===')
console.log(`  fixture groups discovered : ${new Set(badFiles.map(file => file.split('/')[1])).size}`)
console.log(`  good.ts checked (all clean): ${goodFiles.length}`)
console.log(`  bad.ts  checked           : ${badFiles.length}`)
console.log(`  distinct rule IDs asserted present: ${expectedUnion.size}`)
console.log(`  custom rules enforced     : ${CUSTOM_RULE_IDS.join(', ')}`)
console.log(`  manifest not-covered (informational): ${notCovered.length ? notCovered.join(', ') : 'none'}`)

console.log('\nE2E PASSED: every good.ts is clean, every bad.ts reports all its manifest-declared rule IDs, and types resolve.')
