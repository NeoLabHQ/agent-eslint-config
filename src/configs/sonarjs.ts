import sonarjs from 'eslint-plugin-sonarjs'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * SonarJS rule group: control-flow, dead-code, nesting, loops, functions,
 * promises, security, and testing rules.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 163-225.
 * Deliberately EXCLUDES the two sonar rule sets owned by sibling builders:
 *   - the 3 naming rules (`class-name`/`function-name`/`variable-name`, lines
 *     130-155) → owned by `naming.ts`
 *   - `sonarjs/cognitive-complexity` (line 162) → owned by `complexity.ts`
 *
 * antfu does NOT bundle `eslint-plugin-sonarjs`, so this builder registers the
 * plugin. Registering it here (and again in `naming.ts`/`complexity.ts`) is safe:
 * flat config shallow-merges identical plugin references without conflict.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The SonarJS flat-config items.
 */
export function sonarjsConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      plugins: { sonarjs },
      rules: {
        // SONARJS — complexity & control flow (cognitive-complexity lives in complexity.ts)
        'sonarjs/nested-control-flow': ['error', { maximumNestingLevel: 2 }],
        'sonarjs/too-many-break-or-continue-in-loop': 'error',
        'sonarjs/elseif-without-else': 'error',
        'sonarjs/no-nested-conditional': 'error',
        'sonarjs/no-same-line-conditional': 'error',
        'sonarjs/conditional-indentation': 'error',

        // SONARJS — dead code & redundancy
        'sonarjs/no-all-duplicated-branches': 'error',
        'sonarjs/no-duplicated-branches': 'error',
        'sonarjs/no-dead-store': 'error',
        'sonarjs/no-redundant-assignments': 'error',
        'sonarjs/no-identical-functions': ['error', 3],
        'sonarjs/no-useless-catch': 'error',
        'sonarjs/no-useless-increment': 'error',
        'sonarjs/useless-string-operation': 'error',
        'sonarjs/prefer-immediate-return': 'error',

        // SONARJS — nesting & assignments
        'sonarjs/no-nested-assignment': 'error',
        'sonarjs/no-nested-functions': 'error',
        'sonarjs/no-nested-incdec': 'error',
        'sonarjs/no-parameter-reassignment': 'error',
        'sonarjs/destructuring-assignment-syntax': 'error',

        // SONARJS — loops
        'sonarjs/misplaced-loop-counter': 'error',
        'sonarjs/updated-loop-counter': 'error',

        // SONARJS — functions & declarations
        'sonarjs/no-function-declaration-in-block': 'error',
        'sonarjs/no-globals-shadowing': 'error',
        'sonarjs/no-fallthrough': 'error',
        'sonarjs/no-reference-error': 'error',
        'sonarjs/no-unthrown-error': 'error',
        'sonarjs/prefer-type-guard': 'error',

        // SONARJS — promises & async
        'sonarjs/no-try-promise': 'error',

        // SONARJS — security
        'sonarjs/no-hardcoded-ip': 'error',
        'sonarjs/no-hardcoded-passwords': 'error',
        'sonarjs/no-hardcoded-secrets': 'error',
        'sonarjs/os-command': 'error',

        // SONARJS — testing
        'sonarjs/no-skipped-tests': 'error',
        'sonarjs/stable-tests': 'error',
      },
    },
  ]
}
