import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { AgentConfigOptions, ResolvedAgentConfigOptions } from './types'
import antfu from '@antfu/eslint-config'
import { complexityConfig } from './configs/complexity'
import { customConfig } from './configs/custom'
import { jsdocConfig } from './configs/jsdoc'
import { namingConfig } from './configs/naming'
import { promiseConfig } from './configs/promise'
import { sonarjsConfig } from './configs/sonarjs'
import { stylisticConfig } from './configs/stylistic'
import { typeAwareConfig } from './configs/type-aware'
import { unicornConfig } from './configs/unicorn'
import { DEFAULT_ALIAS } from './types'

// Public type surface — re-exported so consumers get the full drop-in contract
// (`AgentConfigOptions`/`AliasOption`) and antfu's own `TypedFlatConfigItem` for
// authoring override items — from this single entry point.
export type { AgentConfigOptions, AliasOption } from './types'
export type { TypedFlatConfigItem } from '@antfu/eslint-config'

/**
 * Every opinionated rule-group builder, in the order their items are emitted.
 *
 * Order among *our* blocks is cosmetic (they own disjoint rules per the task's
 * ownership map); what matters is that this whole list is emitted BEFORE any
 * user config — see {@link config}.
 */
const ourConfigs: Array<(options: ResolvedAgentConfigOptions) => TypedFlatConfigItem[]> = [
  typeAwareConfig,
  sonarjsConfig,
  unicornConfig,
  jsdocConfig,
  namingConfig,
  complexityConfig,
  stylisticConfig,
  promiseConfig,
  customConfig,
]

/**
 * Normalize the public options into the concrete shape every builder consumes.
 *
 * Applies the {@link DEFAULT_ALIAS} default (`{ prefix: '@', sourceDir: 'src' }`),
 * filling in either field the consumer omitted, and preserves an explicit
 * `alias: false` (which disables the root-alias rule downstream). Pure and total:
 * it reads `options.alias` only and returns a fully-resolved value with no optionals.
 *
 * @param options - The raw factory options (antfu options plus our `alias`).
 * @returns Resolved options with `alias` normalized to `false` or concrete settings.
 */
function resolveOptions(options: AgentConfigOptions): ResolvedAgentConfigOptions {
  const { alias } = options
  if (alias === false) {
    return { alias: false }
  }

  return {
    alias: {
      prefix: alias?.prefix ?? DEFAULT_ALIAS.prefix,
      sourceDir: alias?.sourceDir ?? DEFAULT_ALIAS.sourceDir,
    },
  }
}

/**
 * Build the agent ESLint flat config: a thin factory over an untouched
 * `@antfu/eslint-config` base with our opinionated rule groups layered on top.
 *
 * Composition is the override guarantee: `antfu(antfuOptions, ...ourItems,
 * ...userConfigs)` emits every one of our blocks BEFORE the user's configs, so
 * any trailing native `{ files, rules }` item wins by last-match-wins. Nothing
 * we ship is locked.
 *
 * @param options - antfu options (passed through unchanged) plus the bespoke
 *   `alias` option. The `alias` key is stripped before reaching antfu, since it
 *   is not a valid antfu option.
 * @param userConfigs - Native flat-config items appended last to override ours.
 * @returns antfu's `FlatConfigComposer` (supports `.append()`/`.override()`).
 */
export default function config(
  options: AgentConfigOptions = {},
  ...userConfigs: TypedFlatConfigItem[]
): ReturnType<typeof antfu> {
  const resolved = resolveOptions(options)

  // Strip the bespoke `alias` key: it is not a valid antfu option and must never
  // leak into the object forwarded to antfu(). The rest is pure antfu passthrough.
  const { alias: _alias, ...antfuOptions } = options

  const ourItems = ourConfigs.flatMap(build => build(resolved))

  // Order is load-bearing: our items BEFORE ...userConfigs is the override guarantee.
  return antfu(antfuOptions, ...ourItems, ...userConfigs)
}
