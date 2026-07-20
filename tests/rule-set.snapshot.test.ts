import type { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import config from '../src/index'
import baseline from './fixtures/rule-set.baseline.json'
import { resolveRuleSet, toSeverityMap } from './resolve-flat-config'

/**
 * Full-ruleset parity guard.
 *
 * `tests/fixtures/rule-set.baseline.json` is the resolved `{ ruleName:
 * [severity, ...options] }` map of the ORIGINAL `src/eslint.config.mjs` — the
 * copy-pasted company config this package replaces — captured (before that file
 * was deleted) with the exact same `ESLint.calculateConfigForFile` mechanism
 * used here. It is a committed, hand-reviewable artifact, NOT a `toMatchSnapshot`
 * file, so it can never be silently re-baselined by `vitest -u`. The original is
 * also recoverable from git commit `4545706` if the baseline ever needs regenerating.
 *
 * The live factory (`config()`) must resolve to the same rule set: any dropped,
 * added, or re-severitied rule in the modular rewrite fails this test.
 */

const typedBaseline = baseline as unknown as Record<string, Linter.RuleSeverityAndOptions>

// One representative rule per original group — asserts the parity surface
// genuinely spans every group the rewrite had to preserve, so a whole group
// vanishing can never pass unnoticed.
const GROUP_WITNESSES: Record<string, string> = {
  sonarjs: 'sonarjs/no-dead-store',
  unicorn: 'unicorn/no-lonely-if',
  jsdoc: 'jsdoc/require-jsdoc',
  'naming / validate-filename': 'validate-filename/naming-rules',
  'complexity thresholds': 'complexity',
  'sonarjs cognitive-complexity': 'sonarjs/cognitive-complexity',
  'stylistic / padding': 'padding-line-between-statements',
  'stylistic / id-length': 'id-length',
  'eslint core': 'prefer-const',
  'no-restricted-syntax': 'no-restricted-syntax',
  'custom / step-down': 'step-down-rule/step-down',
  'custom / prefer-alias': 'alias/prefer-alias',
  'custom / no-never-return': 'no-never-return/no-never-return-type',
}

describe('full ruleset parity vs original config baseline', () => {
  it('resolves the identical { ruleName: severity } map as the original config', async () => {
    const current = await resolveRuleSet(await config())

    expect(toSeverityMap(current)).toEqual(toSeverityMap(typedBaseline))
  })

  it('preserves each rule\'s full severity+options (thresholds, padding, id-length, …)', async () => {
    const current = await resolveRuleSet(await config())

    // One intended divergence from the original: `alias/prefer-alias`. The old
    // plugin hardcoded `@`/`src` and was configured with no options (`[2]`); the
    // rewrite lifts those into an explicit rule options schema fed from the
    // `alias` factory option. Resolved behavior is identical (its defaults ARE
    // `@`/`src`), so we exempt it from the byte-for-byte options diff and pin its
    // equivalence separately below. Every other rule must match exactly, locking
    // complexity thresholds, padding-line groups, id-length bounds, etc.
    const { 'alias/prefer-alias': _liveAlias, ...currentRest } = current
    const { 'alias/prefer-alias': _baseAlias, ...baselineRest } = typedBaseline
    expect(currentRest).toEqual(baselineRest)
  })

  it('keeps prefer-alias equivalent to the original (same severity, defaults = old hardcoded @/src)', async () => {
    const current = await resolveRuleSet(await config())

    const baselineAlias = typedBaseline['alias/prefer-alias']
    const liveAlias = current['alias/prefer-alias']
    expect(baselineAlias).toBeDefined()
    expect(liveAlias).toBeDefined()

    // Same severity as the original ...
    expect(liveAlias?.[0]).toBe(baselineAlias?.[0])
    // ... and the new explicit options default to the original's hardcoded values.
    expect(liveAlias?.[1]).toEqual({ prefix: '@', sourceDir: 'src' })
  })

  it.each(Object.entries(GROUP_WITNESSES))(
    'covers the %s group (%s present in both baseline and live config)',
    async (_group, ruleName) => {
      const current = await resolveRuleSet(await config())

      expect(typedBaseline[ruleName]).toBeDefined()
      expect(current[ruleName]).toBeDefined()
    },
  )
})
