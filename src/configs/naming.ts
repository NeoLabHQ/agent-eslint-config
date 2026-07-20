import sonarjs from 'eslint-plugin-sonarjs'
import validateFilename from 'eslint-plugin-validate-filename'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * Naming-convention rule group: bans vague identifier/file names
 * (`util`/`common`/`helper`/`function`) and disables antfu's lowercase-title rule.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 22-33
 * (validate-filename + test override) and lines 130-155 (sonar naming rules).
 * The three sonar naming rules live here, NOT in `sonarjs.ts`.
 *
 * antfu bundles neither `eslint-plugin-sonarjs` nor `eslint-plugin-validate-filename`,
 * so both are registered here; `test/prefer-lowercase-title` overrides antfu's
 * already-registered `test` plugin default.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The naming-convention flat-config items.
 */
export function namingConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      plugins: { 'sonarjs': sonarjs, 'validate-filename': validateFilename },
      rules: {
        // Disallow "util", "common", "helper" in file names (e.g. foo.util.ts, common.ts, bar.helpers.ts)
        'validate-filename/naming-rules': [
          'error',
          {
            rules: [
              {
                target: '**/*.ts',
                patterns: '^(?!.*(util|common|helper|function)).+$',
              },
            ],
          },
        ],
        'test/prefer-lowercase-title': 'off',

        // Class names: PascalCase, must NOT contain util, common, helper, function (any case)
        'sonarjs/class-name': [
          'error',
          {
            format:
              '^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))[A-Z][a-zA-Z0-9]*$',
          },
        ],

        // Function names: camelCase or PascalCase, must NOT contain util, common, helper, function (any case)
        // PascalCase allowed for decorators
        'sonarjs/function-name': [
          'error',
          {
            format:
              '^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))[a-zA-Z][a-zA-Z0-9]*$',
          },
        ],

        // Variable names: camelCase, PascalCase or UPPER_SNAKE_CASE, must NOT contain util, common, helper, function (any case)
        'sonarjs/variable-name': [
          'error',
          {
            format:
              '^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))([a-z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]*|[A-Z][a-zA-Z0-9]*|_{1,5})$',
          },
        ],
      },
    },
  ]
}
