# agent-eslint-config

Overly opionated ESLint config preset designed specifically for agents. Forces them to write low-complexity, highly readable code. Supports: Claude, Gemini, Codex and many more.

## Features

- Highly-strict eslint config that includes rules to limit:
  - The cognitive and cyclomatic complexity of code. 
  - The size of functions, files, and classes. 
  - Max depth of nested if statements, loops, and functions.
  - Max amount of statements, lines, and parameters in a function.
- Zero configuration out of the box
- Rules enforce: 
  - Best practices
  - Coding standards
  - Security checks: avoid common vulnerabilities and security risks
  - Usage of types in functions and classes
  - Minimal JSDocs in all definitions
- Custom plugins verify code architecture and filenaming conventions: avoids `util`, `helper`, `common`, `function` names in files, classes, and functions.
- Highly customizable and extendable.
- Based on [`antfu`](https://github.com/antfu/eslint-config), [SonarJS](https://github.com/SonarSource/eslint-plugin-sonarjs), [Unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn) and many more configuration presets and plugins.
- Auto fix for majority of rules
- Increase quality of LLM solutions - after fastly written code is declined by config, LLM usally reflects on solution and tries to refactor and improve beyond config rules.

### Style principle

*Easy of reading and code maintance over everything else.*

- Single quotes, no semi
- Using [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic)
- Stable diff: Sorted imports, dangling commas

> After multiple tests and iterations we found that even minimal decrease in strictness imidiatly abused by agents. So current version can be hard to write manually, but it able to catch bad code in majority of cases.

## Usage

Install ESLint and the config:

```bash
npm install -D eslint agent-eslint-config
```

Create `eslint.config.mjs` at your project root:

```js
// eslint.config.mjs
import config from 'agent-eslint-config'

export default config()
```

Add script for package.json

```json
{
  "scripts": {
    "lint": "eslint",
    "lint:fix": "eslint --fix"
  }
}
```

## Customization

Normally you only need to import the preset

```js
// eslint.config.js
import config from 'agent-eslint-config'

export default config()
```

## Configuring & overriding rules

But you can configure each integration individually. Config support default [`antfu` options](https://github.com/antfu/eslint-config#customization), plus the one bespoke `alias` option documented below.

```js
// eslint.config.js
import config from 'agent-eslint-config'

export default config({
  // Disable the alias rule
  alias: false,

  // Type of the project. 'lib' for libraries, the default is 'app'
  type: 'lib',

  // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
  // The `ignores` option in the option (first argument) is specifically treated to always be global ignores
  // And will **extend** the config's default ignores, not override them
  // You can also pass a function to modify the default ignores
  ignores: [
    '**/fixtures',
    // ...globs
  ],

  // Parse the `.gitignore` file to get the ignores, on by default
  gitignore: true,

  // Enable stylistic formatting rules
  // stylistic: true,

  // Or customize the stylistic rules
  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
    braceStyle: 'stroustrup', // '1tbs', or 'allman'
  },

  // TypeScript and Vue are autodetected, you can also explicitly enable them:
  typescript: true,
  vue: true,

  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,
})
```


The `config` factory function also accepts any number of arbitrary custom config overrides

```js
// eslint.config.js
import config from 'agent-eslint-config'

export default config(
  {
    // Configures for agent-eslint-config
  },

  // From the second arguments they are ESLint Flat Configs
  // you can have multiple configs
  {
    files: ['**/*.ts'],
    rules: {},
  },
  {
    rules: {},
  },
)
```

### Rules Overrides

Certain rules would only be enabled in specific files, for example, ts/* rules would only be enabled in .ts files and vue/* rules would only be enabled in .vue files. If you want to override the rules, you need to specify the file extension:

```js
// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true
  },
  {
    // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
    files: ['**/*.vue'],
    rules: {
      'vue/operator-linebreak': ['error', 'before'],
    },
  },
  {
    // Without `files`, they are general rules for all files (Markdown excluded — see note below)
    rules: {
      'style/semi': ['error', 'never'],
    },
  }
)
```

### Config Composer

`config()` returns [composer object](https://github.com/antfu/eslint-flat-config-utils#composer) that you can chain the methods to compose the config even more flexibly:

```js
// eslint.config.js
import config from 'agent-eslint-config'

export default config()
  .prepend(
    // some configs before the main config
  )
  // overrides any named configs
  .override(
    'antfu/stylistic/rules',
    {
      rules: {
        'style/generator-star-spacing': ['error', { after: true, before: false }],
      }
    }
  )
  // rename plugin prefixes
  .renamePlugins({
    'old-prefix': 'new-prefix',
    // ...
  })
// ...
```

### The `alias` option

`alias` option configures the custom `prefer-alias` rule, which rewrites relative imports that reach into your source directory (e.g. `../services/user`) into an aliased form (e.g. `@/services/user`).

| Value | Effect |
| --- | --- |
| _omitted_ (default) | `{ prefix: '@', sourceDir: 'src' }` |
| `{ prefix?, sourceDir? }` | Customize either field; any omitted field falls back to the default above |
| `false` | Disable the `prefer-alias` rule entirely |

```js
import config from 'agent-eslint-config'

// Default: '@' maps to 'src'
export default config()

// Custom prefix/sourceDir
export default config({ alias: { prefix: '~', sourceDir: 'app' } })

// Disable the alias rule
export default config({ alias: false })
```

## What's included

Layered on top of the full `@antfu/eslint-config` base, this package adds the following opinionated rule groups. Every rule is `error`-level and overridable via the model above.

| Group | Plugin(s) | Covers |
| --- | --- | --- |
| Type-aware | `@typescript-eslint` (`typescript-eslint`) | `strictTypeChecked` preset, `use-unknown-in-catch-callback-variable`, `only-throw-error`, and the custom `no-never-return-type` rule |
| SonarJS | `eslint-plugin-sonarjs` | control-flow, dead-code & redundancy, nesting & assignments, loops, functions & declarations, promises/async, security (hardcoded IP/passwords/secrets, OS command), testing |
| Complexity | ESLint core + `eslint-plugin-sonarjs` | `complexity`, `max-depth`, `max-lines-per-function`, `max-statements`, `max-lines`, `max-nested-callbacks`, `max-params`, and `sonarjs/cognitive-complexity` |
| Unicorn | `eslint-plugin-unicorn` | catch-block hygiene (`catch-error-name`, `prefer-optional-catch-binding`) and general strictness (`no-lonely-if`, `no-nested-ternary`, `no-static-only-class`, `consistent-function-scoping`, …) |
| JSDoc | `eslint-plugin-jsdoc` | `require-jsdoc`, `require-description`, `require-param`, `require-returns`, `check-param-names`, `no-blank-blocks` |
| Naming | `eslint-plugin-sonarjs`, `eslint-plugin-validate-filename` | bans vague identifier/file names (`util`, `common`, `helper`, `function`) via `class-name` / `function-name` / `variable-name` and `validate-filename/naming-rules` |
| Stylistic | ESLint core + `@typescript-eslint` + `perfectionist` | `prefer-const`, `init-declarations`, `id-length`, `padding-line-between-statements`, `preserve-caught-error`, `no-warning-comments`, `consistent-type-definitions`, `class-methods-use-this`, and a `no-restricted-syntax` ban on static methods/properties |
| Promise | `eslint-plugin-promise` | `prefer-await-to-then` |
| Custom | this package | `step-down-rule/step-down` (top-down function ordering, always on), `alias/prefer-alias` (alias-gated), `no-never-return/no-never-return-type` (type-aware) |

## Recommendations

To make the alias rule effective and give TypeScript maximum strictness, mirror the alias in your `tsconfig.json` and enable strict compiler options:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitOverride": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

ESLint has a few limitations due to its architecture that processes each file separately, not allowing cross-file rules. So to add code-duplication checks you can use `jscpd`, and for unused-code checks you can add `knip`.

```bash
npm install -D jscpd knip
```

Create a `knip.json` file:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/main.{js,ts}"],
  "project": ["src/**/*.{js,ts}"],
  "tags": ["-lintignore"],
  "rules": {
    "devDependencies": "off",
    "exports": "error",
    "types": "off"
  }
}
```

Then include them in your `package.json`:

```json
{
  "scripts": {
    "lint": "npm run typecheck && npm run lint:jscpd && npm run lint:knip && npm run lint:eslint",
    "lint:fix": "npm run typecheck && npm run lint:jscpd && npm run lint:eslint -- --fix && npm run lint:knip -- --fix",
    "typecheck": "tsc --noEmit",
    "lint:eslint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint:jscpd": "jscpd --pattern 'src/**/*.{ts,tsx}' -i '**/*.spec.*' -t 0.1",
    "lint:knip": "knip"
  }
}
```

## FAQ

### How to disable type-aware linting

This linter includes a type-aware layer — `@typescript-eslint`'s `strictTypeChecked` preset, extra type-checked rules, and the custom `no-never-return-type` rule. As a result it requires a resolvable `tsconfig.json` in the project root.

If you have files without a resolvable `tsconfig.json`:

1. **Preferred** — add a `tsconfig.json` at your project root that includes those files. This is a one-line fix for most projects and unlocks the type-aware rules.
2. **Otherwise** — append a trailing config item (which wins by the ordering guarantee) that turns type-aware parsing **and** every type-checked rule off for the affected globs.

   Turning off `projectService` alone is **not** enough: the type-aware layer emits its type-checked rules *globally* (with no `files` restriction), so those rules would still run against the untyped files and throw _"You have used a rule which requires type information …"_ errors. You must also disable the type-checked rules for the same glob. `typescript-eslint`'s `disableTypeChecked.rules` switches off the whole `@typescript-eslint` type-checked set (the `strictTypeChecked` preset plus `use-unknown-in-catch-callback-variable` and `only-throw-error`) in one spread; then disable the one custom type-aware rule, which is not part of that preset:

   ```js
   // eslint.config.mjs
   import config from 'agent-eslint-config'
   import tseslint from 'typescript-eslint' // shipped as a dependency of this package

   export default config(
     {},
     {
       files: ['scripts/**/*.js'],
       // Stop resolving type information for these files.
       languageOptions: {
         parserOptions: { projectService: false },
       },
       rules: {
         // Turn off the full @typescript-eslint type-checked rule set
         // (strictTypeChecked + use-unknown-in-catch-callback-variable +
         // only-throw-error) so none of them demand parser services here.
         ...tseslint.configs.disableTypeChecked.rules,
         // The custom type-aware rule is not part of disableTypeChecked, so
         // turn it off explicitly.
         'no-never-return/no-never-return-type': 'off',
       },
     },
   )
   ```

   > If your package manager isolates transitive dependencies (e.g. pnpm's strict `node_modules`) and the `typescript-eslint` import does not resolve, add it directly with `npm install -D typescript-eslint`.