import type { OptionsConfig } from '@antfu/eslint-config'

/**
 * Fully-resolved alias settings consumed by the root-alias rule.
 *
 * Both fields are required here (unlike {@link AliasOption}) because these are
 * the values *after* the factory has applied {@link DEFAULT_ALIAS}. Builders and
 * the root-alias rule read concrete `prefix`/`sourceDir` values, never optionals.
 */
export interface AliasSettings {
  /** Import-path prefix that stands in for the source root (e.g. `@`). */
  prefix: string
  /** Source directory the prefix maps to, relative to the project root (e.g. `src`). */
  sourceDir: string
}

/**
 * The single bespoke option this package adds on top of antfu's {@link OptionsConfig}.
 *
 * `false` disables the root-alias rule entirely; an object customizes it. Both
 * fields are optional so a consumer can override just one and inherit the other
 * from {@link DEFAULT_ALIAS}. Derived from {@link AliasSettings} so the two stay
 * in lockstep (DRY).
 */
export type AliasOption = false | Partial<AliasSettings>

/**
 * Default alias settings applied when a consumer passes no `alias` option (or
 * omits one of its fields): the `@` prefix mapped to the `src` directory.
 */
export const DEFAULT_ALIAS: AliasSettings = {
  prefix: '@',
  sourceDir: 'src',
}

/**
 * Public options for the `config()` factory: a strict superset of antfu's
 * {@link OptionsConfig}, so every antfu toggle (`typescript`, `vue`, `stylistic`,
 * `ignores`, …) passes through unchanged and the package is a drop-in replacement.
 *
 * The only addition is {@link AliasOption `alias`}; the factory strips it before
 * forwarding the remaining options to `antfu()`, since it is not a valid antfu key.
 */
export interface AgentConfigOptions extends OptionsConfig {
  /**
   * Configure the custom root-alias rule. Defaults to {@link DEFAULT_ALIAS}
   * (`{ prefix: '@', sourceDir: 'src' }`); set to `false` to disable the rule.
   */
  alias?: AliasOption
}

/**
 * The internal, resolved shape passed to every `configs/*.ts` builder. The
 * bespoke `alias` option is normalized to either `false` (disabled) or a fully
 * populated {@link AliasSettings} — no optionals remain, so builders never
 * re-apply defaults.
 */
export interface ResolvedAgentConfigOptions {
  /** Resolved alias: `false` when disabled, otherwise concrete settings. */
  alias: false | AliasSettings
}
