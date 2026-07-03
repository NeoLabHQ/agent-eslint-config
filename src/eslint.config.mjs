import antfu from '@antfu/eslint-config'
import validateFilename from 'eslint-plugin-validate-filename'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'
import promisePlugin from 'eslint-plugin-promise'
import stepDownPlugin from './eslint.plugin.step-down-rule.mjs'
import aliasPlugin from './eslint.plugin.root-alias.mjs'
import noNeverReturnPlugin from './eslint.plugin.no-never-return-type.cjs'

export default antfu({
  plugins: {
    'alias': aliasPlugin,
    'validate-filename': validateFilename,
    'promise': promisePlugin,
    'step-down-rule': stepDownPlugin,
  },
  ignores: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts', '**/*.test-utils.ts', '**/*.md', 'test/e2e-env-setup.ts', 'smoke-tests/**'],
  rules: {
    'alias/prefer-alias': 'error',

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
    'ts/consistent-type-imports': 'off', // Disable for NestJS - injectable classes need value imports for DI to work
    'promise/prefer-await-to-then': 'error',
    'perfectionist/sort-named-imports': 'off',
    'step-down-rule/step-down': 'error',

    // Complexity rules
    'complexity': ['error', 10], // cyclicomatic complexity, for congitive complexity check sonarjs/cognitive-complexity at the end of the file
    'max-depth': ['error', 2],
    'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    'max-statements': ['error', 10],
    'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 3],
  },
}).append(
  // Add strictTypeChecked rules (skip config[0] which re-registers the plugin/parser already provided by antfu)
  ...tseslint.configs.strictTypeChecked.slice(1),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: { sonarjs, 'no-never-return': noNeverReturnPlugin },
    rules: {
      // ═══════════════════════════════════════════════════════════════
      //  CUSTOM — ban never-returning functions
      // ═══════════════════════════════════════════════════════════════
      // such function usally result of LLM writing code using side effect pattern to validate input or handle error.
      'no-never-return/no-never-return-type': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  JSDOC — documentation enforcement
      // ═══════════════════════════════════════════════════════════════
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/no-blank-blocks': 'error',
      // ═══════════════════════════════════════════════════════════════
      //  UNICORN — catch block hygiene
      // ═══════════════════════════════════════════════════════════════
      'unicorn/catch-error-name': ['error', { name: 'error' }],
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/throw-new-error': 'off', // fail catch decorators

      // ═══════════════════════════════════════════════════════════════
      //  UNICORN — general strictness
      // ═══════════════════════════════════════════════════════════════
      'unicorn/consistent-destructuring': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-static-only-class': 'error',
      'unicorn/prefer-class-fields': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  TYPESCRIPT-ESLINT — throw/catch safety
      // ═══════════════════════════════════════════════════════════════
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // ═══════════════════════════════════════════════════════════════
      //  TYPESCRIPT-ESLINT — class method purity
      // ═══════════════════════════════════════════════════════════════
      'class-methods-use-this': 'off',
      '@typescript-eslint/class-methods-use-this': ['error', {
        ignoreOverrideMethods: true,
        ignoreClassesThatImplementAnInterface: 'public-fields',
      }],

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — naming conventions (ban vague names)
      // ═══════════════════════════════════════════════════════════════

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

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — complexity & control flow
      // ═══════════════════════════════════════════════════════════════
      // Designed for modern devs with minimal attention span
      // Code with cognitive complexity 5 or upper hard to read in 5 seconds
      'sonarjs/cognitive-complexity': ['error', 4],
      'sonarjs/nested-control-flow': ['error', { maximumNestingLevel: 2 }],
      'sonarjs/too-many-break-or-continue-in-loop': 'error',
      'sonarjs/elseif-without-else': 'error',
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/no-same-line-conditional': 'error',
      'sonarjs/conditional-indentation': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — dead code & redundancy
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-dead-store': 'error',
      'sonarjs/no-redundant-assignments': 'error',
      'sonarjs/no-identical-functions': ['error', 3],
      'sonarjs/no-useless-catch': 'error',
      'sonarjs/no-useless-increment': 'error',
      'sonarjs/useless-string-operation': 'error',
      'sonarjs/prefer-immediate-return': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — nesting & assignments
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-nested-assignment': 'error',
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-incdec': 'error',
      'sonarjs/no-parameter-reassignment': 'error',
      'sonarjs/destructuring-assignment-syntax': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — loops
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/misplaced-loop-counter': 'error',
      'sonarjs/updated-loop-counter': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — functions & declarations
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-function-declaration-in-block': 'error',
      'sonarjs/no-globals-shadowing': 'error',
      'sonarjs/no-fallthrough': 'error',
      'sonarjs/no-reference-error': 'error',
      'sonarjs/no-unthrown-error': 'error',
      'sonarjs/prefer-type-guard': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — promises & async
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-try-promise': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — security
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-hardcoded-ip': 'error',
      'sonarjs/no-hardcoded-passwords': 'error',
      'sonarjs/no-hardcoded-secrets': 'error',
      'sonarjs/os-command': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  SONARJS — testing
      // ═══════════════════════════════════════════════════════════════
      'sonarjs/no-skipped-tests': 'error',
      'sonarjs/stable-tests': 'error',

      // ═══════════════════════════════════════════════════════════════
      //  ESLINT CORE
      // ═══════════════════════════════════════════════════════════════
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

      // ═══════════════════════════════════════════════════════════════
      //  NO-RESTRICTED-SYNTAX — ban static methods and properties
      // ═══════════════════════════════════════════════════════════════
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
)
