import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * Unicorn rule overrides: catch-block hygiene plus general strictness.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 94-107.
 *
 * antfu already bundles and registers `eslint-plugin-unicorn`, so this builder
 * only overrides rule severities; it does NOT re-register the plugin.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The unicorn override flat-config items.
 */
export function unicornConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      rules: {
        // UNICORN — catch block hygiene
        'unicorn/catch-error-name': ['error', { name: 'error' }],
        'unicorn/prefer-optional-catch-binding': 'error',
        'unicorn/throw-new-error': 'off', // fail catch decorators

        // UNICORN — general strictness
        'unicorn/consistent-destructuring': 'error',
        'unicorn/consistent-function-scoping': 'error',
        'unicorn/custom-error-definition': 'error',
        'unicorn/no-lonely-if': 'error',
        'unicorn/no-nested-ternary': 'error',
        'unicorn/no-static-only-class': 'error',
        'unicorn/prefer-class-fields': 'error',
      },
    },
  ]
}
