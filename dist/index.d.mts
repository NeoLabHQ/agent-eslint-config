import antfu, { OptionsConfig, TypedFlatConfigItem, TypedFlatConfigItem as TypedFlatConfigItem$1 } from "@antfu/eslint-config";

//#region src/types.d.ts
/**
 * Fully-resolved alias settings consumed by the root-alias rule.
 *
 * Both fields are required here (unlike {@link AliasOption}) because these are
 * the values *after* the factory has applied {@link DEFAULT_ALIAS}. Builders and
 * the root-alias rule read concrete `prefix`/`sourceDir` values, never optionals.
 */
interface AliasSettings {
  /** Import-path prefix that stands in for the source root (e.g. `@`). */
  prefix: string;
  /** Source directory the prefix maps to, relative to the project root (e.g. `src`). */
  sourceDir: string;
}
/**
 * The single bespoke option this package adds on top of antfu's {@link OptionsConfig}.
 *
 * `false` disables the root-alias rule entirely; an object customizes it. Both
 * fields are optional so a consumer can override just one and inherit the other
 * from {@link DEFAULT_ALIAS}. Derived from {@link AliasSettings} so the two stay
 * in lockstep (DRY).
 */
type AliasOption = false | Partial<AliasSettings>;
/**
 * Public options for the `config()` factory: a strict superset of antfu's
 * {@link OptionsConfig}, so every antfu toggle (`typescript`, `vue`, `stylistic`,
 * `ignores`, …) passes through unchanged and the package is a drop-in replacement.
 *
 * The only addition is {@link AliasOption `alias`}; the factory strips it before
 * forwarding the remaining options to `antfu()`, since it is not a valid antfu key.
 */
interface AgentConfigOptions extends OptionsConfig {
  /**
   * Configure the custom root-alias rule. Defaults to {@link DEFAULT_ALIAS}
   * (`{ prefix: '@', sourceDir: 'src' }`); set to `false` to disable the rule.
   */
  alias?: AliasOption;
}
//#endregion
//#region src/index.d.ts
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
declare function config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem$1[]): ReturnType<typeof antfu>;
//#endregion
export { type AgentConfigOptions, type AliasOption, type TypedFlatConfigItem, config as default };