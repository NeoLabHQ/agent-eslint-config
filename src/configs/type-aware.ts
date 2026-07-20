import tseslint from 'typescript-eslint'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'
import noNeverReturnPlugin from '../plugins/no-never-return-type'

/**
 * Type-aware rule group: enables `@typescript-eslint`'s `strictTypeChecked`
 * preset, forces type-aware parsing on, and wires the extra type-checked rules
 * plus the custom `no-never-return-type` rule.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 50-58
 * (sliced `strictTypeChecked` + `projectService`), line 66 (`no-never-return`),
 * and lines 112-113 (`use-unknown-in-catch-callback-variable`, `only-throw-error`).
 *
 * `strictTypeChecked[0]` is a pure plugin/parser registration that antfu's own
 * `typescript` config already provides, so it is dropped with `.slice(1)` to
 * avoid a duplicate `@typescript-eslint` registration (which would double every
 * type-checked report). The remaining items reference `@typescript-eslint/*`
 * rules against antfu's registration, so this builder registers only the custom
 * `no-never-return` plugin (antfu does NOT bundle it).
 *
 * `tsconfigRootDir` is deliberately omitted: the copied config pinned it to this
 * package's own directory, which would resolve inside the consumer's
 * `node_modules` once installed and break type-aware linting. Omitting it lets
 * `projectService` default to `process.cwd()` — the consumer's project root.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The type-aware flat-config items.
 */
export function typeAwareConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    // [0] only re-registers the plugin/parser antfu already provides — drop it.
    // Cast bridges typescript-eslint's `CompatibleConfig` to antfu's
    // `TypedFlatConfigItem`: the two flat-config item types are structurally
    // compatible but not assignable under `exactOptionalPropertyTypes`.
    ...(tseslint.configs.strictTypeChecked.slice(1) as TypedFlatConfigItem[]),
    {
      languageOptions: {
        parserOptions: {
          // No `tsconfigRootDir`: defaults to the consumer's `process.cwd()`.
          projectService: true,
        },
      },
    },
    {
      plugins: { 'no-never-return': noNeverReturnPlugin },
      rules: {
        // Custom — ban never-returning functions (LLM side-effect throw pattern).
        'no-never-return/no-never-return-type': 'error',

        // Type-checked throw/catch safety (resolve against antfu's registration).
        '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
        '@typescript-eslint/only-throw-error': 'error',
      },
    },
  ]
}
