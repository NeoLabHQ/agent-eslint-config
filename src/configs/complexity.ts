import sonarjs from 'eslint-plugin-sonarjs'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * Complexity-threshold rule group: ESLint-core cyclomatic/size limits plus
 * SonarJS cognitive-complexity (its natural companion).
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 40-46
 * (core thresholds) and line 162 (`sonarjs/cognitive-complexity`). This builder,
 * NOT `sonarjs.ts`, owns cognitive-complexity so both complexity dimensions
 * (cyclomatic + cognitive) live together.
 *
 * antfu does NOT bundle `eslint-plugin-sonarjs`, so the plugin is registered here
 * (safe to re-register the same reference across sibling builders).
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The complexity-threshold flat-config items.
 */
export function complexityConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      plugins: { sonarjs },
      rules: {
        // Complexity rules
        'complexity': ['error', 10], // cyclomatic complexity; cognitive complexity is sonarjs/cognitive-complexity below
        'max-depth': ['error', 2],
        'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
        'max-statements': ['error', 10],
        'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
        'max-nested-callbacks': ['error', 3],
        'max-params': ['error', 3],

        // Designed for modern devs with minimal attention span.
        // Code with cognitive complexity 5 or upper is hard to read in 5 seconds.
        'sonarjs/cognitive-complexity': ['error', 4],
      },
    },
  ]
}
