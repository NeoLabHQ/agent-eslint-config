import promisePlugin from 'eslint-plugin-promise'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * Promise rule group: enforces `await` over `.then()` chaining.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` line 5 (plugin
 * import/registration) and line 35 (`promise/prefer-await-to-then`).
 *
 * antfu does NOT bundle `eslint-plugin-promise`, so this builder registers the
 * plugin itself; omitting it would silently drop the rule.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The promise flat-config items.
 */
export function promiseConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      plugins: { promise: promisePlugin },
      rules: {
        'promise/prefer-await-to-then': 'error',
      },
    },
  ]
}
