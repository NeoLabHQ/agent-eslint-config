import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * Stylistic / code-shape rule group: ESLint-core formatting and declaration
 * rules, static-member bans, and select `@typescript-eslint`/`perfectionist`
 * overrides.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 34, 36,
 * 114, 119-123, and 230-281.
 *
 * All referenced plugins (`ts`/`@typescript-eslint`, `perfectionist`) are already
 * registered by antfu, so this builder only overrides rule severities/options.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The stylistic flat-config items.
 */
export function stylisticConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      rules: {
        // Deliberate keep: NestJS injectable classes need value imports for DI to
        // work, so type-only import enforcement stays disabled for this ruleset.
        'ts/consistent-type-imports': 'off',
        'perfectionist/sort-named-imports': 'off',

        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

        // TYPESCRIPT-ESLINT — class method purity
        'class-methods-use-this': 'off',
        '@typescript-eslint/class-methods-use-this': ['error', {
          ignoreOverrideMethods: true,
          ignoreClassesThatImplementAnInterface: 'public-fields',
        }],

        // ESLINT CORE
        'no-warning-comments': [
          'error',
          {
            terms: ['jscpd:ignore-start', 'jscpd:ignore-end'],
            location: 'anywhere',
          },
        ],
        'prefer-const': 'error',
        'init-declarations': ['error', 'always'],
        'id-length': [
          'error',
          {
            min: 3,
            max: 35,
            exceptions: ['i', 'j', 'k', 'x', 'y', 'z', '_', 'id', 'on', 'in', 'of'],
          },
        ],
        'padding-line-between-statements': [
          'error',
          // Blank line after variable declarations
          { blankLine: 'always', prev: ['const', 'let'], next: '*' },
          // ...except between consecutive declarations
          { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
          // Blank line before return
          { blankLine: 'always', prev: '*', next: 'return' },
          // Blank line before/after control flow
          { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
          // ...except when const/let is directly before if
          { blankLine: 'any', prev: ['const', 'let'], next: 'if' },
          { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },
        ],

        'preserve-caught-error': 'error',

        // NO-RESTRICTED-SYNTAX — ban static methods and properties
        'no-restricted-syntax': [
          'error',
          // 1. Ban static methods — use instance methods instead
          {
            selector: 'MethodDefinition[static=true]',
            message:
              'Do not use static methods. Convert to an instance method or extract to a standalone function.',
          },
          // 2. Ban static properties — use instance properties instead
          {
            selector: 'PropertyDefinition[static=true]',
            message:
              'Do not use static properties. Use instance properties instead.',
          },
        ],
      },
    },
  ]
}
