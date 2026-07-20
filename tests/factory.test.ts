import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import { describe, expect, it } from 'vitest'
import config from '../src/index'
import { resolveRuleSet } from './resolve-flat-config'

/**
 * Factory-behavior tests. These assert the STRUCTURE of the composed config —
 * ordering, item-count deltas, option-gated inclusion — deliberately without
 * coupling to which specific rules antfu or we enable (that churn-prone surface
 * is owned by `rule-set.snapshot.test.ts`). The one exception is the override
 * "takes effect" check, which by nature names the rule it overrides.
 */

describe('composer resolution', () => {
  it('returns antfu\'s composer (chainable) that resolves to a non-empty array', async () => {
    const composer = config()

    // Antfu's FlatConfigComposer contract: chainable `.append`/`.override`.
    expect(typeof composer.append).toBe('function')
    expect(typeof composer.override).toBe('function')

    // The composer is a thenable resolving to the flat-config array.
    const resolved = await composer
    expect(Array.isArray(resolved)).toBe(true)
    expect(resolved.length).toBeGreaterThan(0)
  })
})

describe('override guarantee via composition order', () => {
  it('appends a trailing user config AFTER every one of our items (by index)', async () => {
    const sentinel: TypedFlatConfigItem = {
      name: 'sentinel/user-override',
      files: ['**/*.ts'],
      rules: { complexity: 'off' },
    }

    const baseline = await config()
    const withSentinel = await config({}, sentinel)

    // Exactly one item added, and it sits at the very last index — after all of
    // antfu's items AND all of ours (which are wholly contained in `baseline`).
    expect(withSentinel).toHaveLength(baseline.length + 1)

    const lastItem = withSentinel.at(-1)
    expect(lastItem?.name).toBe(sentinel.name)
    expect(lastItem?.rules).toEqual(sentinel.rules)

    // No pre-existing item carried the sentinel's marker: it is genuinely the
    // appended one, positioned last rather than merged somewhere earlier.
    const priorIndex = baseline.findIndex(item => item.name === sentinel.name)
    expect(priorIndex).toBe(-1)
  })

  it('lets a user config override one of our rules (last-match-wins)', async () => {
    // `complexity` is one of OUR opinionated rules (configs/complexity.ts sets
    // it to error). A trailing user item turning it off must win for `.ts`.
    const withoutOverride = await resolveRuleSet(await config())
    expect(withoutOverride.complexity?.[0]).toBe(2)

    const withOverride = await resolveRuleSet(
      await config({}, { files: ['**/*.ts'], rules: { complexity: 'off' } }),
    )
    expect(withOverride.complexity?.[0]).toBe(0)
  })
})

describe('antfu passthrough / drop-in superset', () => {
  it('yields strictly more config items when an antfu option is enabled', async () => {
    const baseline = await config()
    const withVue = await config({ vue: true })

    // Enabling an antfu language option must add its config items on top of the
    // baseline — asserted purely by item count, referencing no specific rule.
    expect(withVue.length).toBeGreaterThan(baseline.length)
  })
})

describe('alias option behavior', () => {
  it('includes the root-alias rule by default and omits it when alias:false', async () => {
    const withDefault = await config()
    const withoutAlias = await config({ alias: false })

    // Disabling `alias` drops the root-alias config item — a different config set.
    expect(withoutAlias.length).toBeLessThan(withDefault.length)

    const defaultRules = await resolveRuleSet(withDefault)
    const disabledRules = await resolveRuleSet(withoutAlias)
    expect(defaultRules['alias/prefer-alias']).toBeDefined()
    expect(disabledRules['alias/prefer-alias']).toBeUndefined()
  })
})
