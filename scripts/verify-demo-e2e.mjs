#!/usr/bin/env node
/**
 * End-to-end verification of `agent-eslint-config` against the `demo/` consumer.
 *
 * Ordered, fail-loud pipeline (each stage throws → non-zero exit on any failure):
 *   1. Rebuild the root package FIRST, so a stale `dist/` can never mask a
 *      regression in what consumers actually import.
 *   2. `npm install --prefix demo` — resolve the `file:..` dependency plus the
 *      `eslint`/`typescript` peers into an isolated `demo/node_modules`.
 *   3. `tsc --noEmit` in `demo/` — prove the default import and its types resolve
 *      from the built `dist/` artifacts (type-resolution proof).
 *   4. Lint `good.ts` and assert ZERO problems (no errors, no warnings).
 *   5. Lint `bad.ts` and assert — from the structured ESLint JSON, not the exit
 *      code alone — that each of the three custom rule IDs is reported.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demoDir = path.join(rootDir, 'demo')
const eslintBin = path.join(demoDir, 'node_modules', '.bin', 'eslint')
const tscBin = path.join(demoDir, 'node_modules', '.bin', 'tsc')

// The exact plugin/rule namespaces as emitted by the config (see
// src/configs/custom.ts and src/configs/type-aware.ts).
const EXPECTED_BAD_RULE_IDS = [
  'step-down-rule/step-down',
  'alias/prefer-alias',
  'no-never-return/no-never-return-type',
]

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
  const result = spawnSync(
    eslintBin,
    ['--format', 'json', relativeFile],
    { cwd: demoDir, encoding: 'utf8' },
  )

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
 * Assert `good.ts` is completely clean — zero errors AND zero warnings.
 */
function assertGoodIsClean() {
  const good = lintFile('fixtures/good.ts')

  console.log(`\n=== assert good.ts is clean ===`)
  console.log(`good.ts → ${good.errorCount} error(s), ${good.warningCount} warning(s)`)

  if (good.errorCount !== 0 || good.warningCount !== 0) {
    const rendered = good.messages
      .map(message => `  - ${message.ruleId ?? '(no rule)'}: ${message.message} (line ${message.line})`)
      .join('\n')

    throw new Error(`Expected good.ts to report zero problems, got:\n${rendered}`)
  }
}

/**
 * Assert `bad.ts` reports each of the three custom rule IDs at least once,
 * driven off the structured JSON rule IDs (never the exit code alone).
 */
function assertBadTriggersCustomRules() {
  const bad = lintFile('fixtures/bad.ts')
  const reportedRuleIds = new Set(bad.messages.map(message => message.ruleId))

  console.log(`\n=== assert bad.ts triggers the custom rules ===`)
  console.log(`bad.ts → ${bad.errorCount} error(s); rule IDs reported:`)
  for (const ruleId of [...reportedRuleIds].sort()) {
    console.log(`  - ${ruleId}`)
  }

  const missing = EXPECTED_BAD_RULE_IDS.filter(ruleId => !reportedRuleIds.has(ruleId))
  if (missing.length > 0) {
    throw new Error(`bad.ts did not report the expected custom rule(s): ${missing.join(', ')}`)
  }

  console.log(`\nAll expected custom rule IDs present: ${EXPECTED_BAD_RULE_IDS.join(', ')}`)
}

runStage('1/5 rebuild root package (no stale dist)', 'npm', ['run', 'build'], rootDir)
runStage('2/5 install demo (file:.. + peers)', 'npm', ['install', '--prefix', demoDir, '--no-audit', '--no-fund'], rootDir)
runStage('3/5 typecheck demo (type-resolution proof)', tscBin, ['--noEmit'], demoDir)

assertGoodIsClean()
assertBadTriggersCustomRules()

console.log('\nE2E PASSED: good.ts clean, bad.ts reports all three custom rules, types resolve.')
