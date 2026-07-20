import type { Linter } from 'eslint'
import path from 'node:path'
import { ESLint } from 'eslint'

/**
 * The virtual file path every rule-set resolution is computed against.
 *
 * A single fixed `.ts` path keeps the factory and snapshot tests comparing the
 * exact same glob-matched config set, and matches the path the committed
 * `tests/fixtures/rule-set.baseline.json` was extracted with, so the parity
 * diff is apples-to-apples. It need not exist on disk — ESLint's
 * `calculateConfigForFile` resolves config purely by matching `files`/`ignores`
 * globs, it does not read the file.
 */
const RESOLUTION_TARGET = 'src/sample.ts'

/**
 * Normalized rule entry as ESLint resolves it: `[severity, ...options]`, where
 * severity is `0` (off), `1` (warn), or `2` (error).
 */
type ResolvedRuleEntry = Linter.RuleSeverityAndOptions

/**
 * Ask ESLint to resolve the effective rule set a flat-config array applies to a
 * TypeScript file, with last-match-wins cascade already applied.
 *
 * This is the canonical way to observe what a consumer's ESLint would actually
 * enforce: rather than re-implementing flat-config glob matching and rule
 * merging, we hand the array to a real `ESLint` instance and read back its
 * computed config. Both the parity baseline and the live config are measured
 * this way, so any difference is a genuine rule/severity drift, not a
 * measurement artifact.
 *
 * @param configArray - A fully resolved flat-config array (e.g. `await config()`).
 * @returns The effective `{ ruleName: [severity, ...options] }` map for a `.ts` file.
 */
export async function resolveRuleSet(
  configArray: Linter.Config[],
): Promise<Record<string, ResolvedRuleEntry>> {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    baseConfig: configArray,
  })

  const resolved = await eslint.calculateConfigForFile(
    path.join(process.cwd(), RESOLUTION_TARGET),
  )

  return resolved.rules ?? {}
}

/**
 * Reduce a resolved rule map to `{ ruleName: severity }`, dropping options.
 *
 * This is the parity surface the task tracks: presence and severity of every
 * rule across all opinionated groups, resistant to option-shape churn.
 *
 * @param ruleSet - A resolved rule map from {@link resolveRuleSet}.
 * @returns A map of rule name to its integer severity (`0` | `1` | `2`).
 */
export function toSeverityMap(
  ruleSet: Record<string, ResolvedRuleEntry>,
): Record<string, ResolvedRuleEntry[0]> {
  return Object.fromEntries(
    Object.entries(ruleSet).map(([ruleName, entry]) => [ruleName, entry[0]]),
  )
}
