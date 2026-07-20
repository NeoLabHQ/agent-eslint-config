<p align="center">
  <img src="./docs/assets/eslint-logo-color.svg" width="256px" alt="ESLint logo" />
</p>

<div align="center">

<h1>Agent ESLint Config</h1>

Overly opinionated ESLint config that forces agents to write low-complexity, highly readable code.

[Quick Start](#quick-start) •
[Customization](#customization) •
[Included Rules](#included-rules) •
[Examples](#examples) •
[Recommendations](#recommendations) •
[FAQ](#faq)

</div>

ESLint config preset designed specifically for agents. It provides the strictest possible rules to limit code complexity and security risks, while enforcing best practices and coding standards. Supports Claude, Gemini, Codex, Antigravity, OpenCode, and many more.

## Features

- Zero configuration out of the box
- Highly strict ESLint config that includes rules to limit:
  - The cognitive and cyclomatic complexity of code.
  - The size of functions, files, and classes.
  - The maximum depth of nested `if` statements, loops, and functions.
  - The maximum number of statements, lines, and parameters in a function.
- Rules enforce:
  - Best practices
  - Coding standards
  - Security checks: avoid common vulnerabilities and security risks
  - Usage of types in functions and classes
  - Minimal JSDoc on all definitions
- Custom plugins verify code architecture and file-naming conventions: they forbid `util`, `helper`, `common`, and `function` names in files, classes, and functions.
- Highly customizable and extendable.
- Based on [`antfu`](https://github.com/antfu/eslint-config), [SonarJS](https://github.com/SonarSource/eslint-plugin-sonarjs), [Unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn), and many more configuration presets and plugins.
- Auto-fix for the majority of rules.
- Increases the quality of LLM solutions - after quickly written code is rejected by the config, the LLM usually reflects on its solution and tries to refactor and improve it beyond the config's rules, resulting in better code.

### Style principle

*Ease of reading and code maintenance above everything else.*

- Single quotes, no semicolons
- Uses [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic)
- Stable diffs: sorted imports, dangling commas
- Empty lines between statements and blocks
- Short, single-purpose functions and classes

### Manual usage

Our team have been using and testing this config for over a year, over multiple production projects. Empirically, we found that even a slightest decrease in strictness is immediately abused by agents. Resulting in significant code quality regressions. To prevent it, configuration is set so strictly that it allow zero room for misinterpretation, and able to catch bad code in the majority of cases. Unfortunatelly, simultaniusly, writing code by hands becomes quite difficult, but still possible. 

## Quick Start

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

Add scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint",
    "lint:fix": "eslint --fix"
  }
}
```

## Recommendations

### Usage with agents

We advice you to use this config together with skills like [`/do-and-judge`](https://neolab.gitbook.io/cek/plugins/sadd/do-and-judge) that forces agents to write code, verify it using linter and then fix it until gate is passed.

### TypeScript configuration

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

### Code duplication and unused code checks

ESLint has a few limitations due to its architecture, which processes each file separately and does not allow cross-file rules. So, to add code-duplication checks you can use `jscpd`, and for unused-code checks you can add `knip`.

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

## Examples

Examples of code before and after linting. For more examples, see the [`demo/fixtures/`](demo/fixtures/) directory.


### 1. Decompose a monolithic function

Bad code:

```ts
interface RegisteredUser {
  id: string
  email: string
  passwordHash: string
}

const registry: RegisteredUser[] = []

async function processUserRegistration(input: unknown): Promise<RegisteredUser> {
  const data = input as any                           
  if (!data.email || typeof data.email !== 'string') throw new Error('email is required')
  if (!data.password || typeof data.password !== 'string') throw new Error('password is required')
  const email = data.email.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('invalid email')
  let hash = ''
  for (const character of data.password) {
    if (typeof character === 'string') {
      hash = hash + String(character.charCodeAt(0) * 31 % 255)
    }
  }
  for (const existing of registry) {
    if (existing.email === email) {
      throw new Error('email already registered')
    }
  }
  const user = { id: String(registry.length + 1), email, passwordHash: hash }
  registry.push(user)
  const name = data.name ? String(data.name) : email
  console.error('welcome ' + name)
  console.error('sending confirmation to ' + email)
  await Promise.resolve()

  return user
}
```

Good code:

```ts
interface RegistrationInput {
  email: string
  password: string
}

interface RegisteredUser {
  id: string
  email: string
  passwordHash: string
}

const registry: RegisteredUser[] = []

/**
 * Registers a user: validate, normalize, persist, then notify.
 * @param input The untrusted registration payload.
 * @returns The persisted user record.
 */
export async function processUserRegistration(input: unknown): Promise<RegisteredUser> {
  const valid = validateRegistrationInput(input)
  const user = normalizeAndHash(valid)

  await persistUser(user)
  notifyRegistration(user)

  return user
}

/**
 * Narrows an untrusted payload into a typed registration input.
 * @param input The untrusted registration payload.
 * @returns The validated input.
 */
function validateRegistrationInput(input: unknown): RegistrationInput {
  if (typeof input !== 'object' || input === null) {
    throw new Error('input must be an object')
  }

  const record = input as Record<string, unknown>

  if (typeof record.email !== 'string' || !record.email.includes('@')) {
    throw new Error('a valid email is required')
  }

  if (typeof record.password !== 'string') {
    throw new TypeError('a password is required')
  }

  return { email: record.email, password: record.password }
}

/**
 * Normalizes the email and derives a password hash.
 * @param input The validated registration input.
 * @returns A user record ready to persist.
 */
function normalizeAndHash(input: RegistrationInput): RegisteredUser {
  const email = input.email.trim().toLowerCase()
  const codes = Array.from(input.password, character => character.charCodeAt(0) * 31 % 255)

  return { id: String(registry.length + 1), email, passwordHash: codes.join('-') }
}

/**
 * Persists a user, rejecting a duplicate email.
 * @param user The user record to store.
 */
async function persistUser(user: RegisteredUser): Promise<void> {
  const duplicate = registry.some(existing => existing.email === user.email)

  if (duplicate) {
    throw new Error('email already registered')
  }

  await Promise.resolve()
  registry.push(user)
}

/**
 * Emits registration notifications for a new user.
 * @param user The freshly registered user.
 */
function notifyRegistration(user: RegisteredUser): void {
  console.error(`welcome, new user ${user.email}`)
  console.error(`sending confirmation to ${user.email}`)
}
```

### 2. Flatten nested control flow

Bad code:

```ts
interface User {
  role: string
  isDeleted: boolean
  emailVerified: boolean
}

declare const db: { users: { findById: (id: string) => Promise<User | null> } }

async function validateUser(userId: string, role: string): Promise<User> {  // jsdoc/require-jsdoc + sonarjs/cognitive-complexity + max-statements
  if (userId) {
    const user = await db.users.findById(userId)
    if (user) {
      if (!user.isDeleted) {                 // max-depth + sonarjs/nested-control-flow: nested beyond 2 levels
        if (user.role === role) {
          if (user.emailVerified) {
            // happy path buried 5 levels deep
            return user
          } else {
            throw new Error('Email not verified')
          }
        } else {
          throw new Error('Insufficient role')
        }
      } else {
        throw new Error('User is deleted')
      }
    } else {
      throw new Error('User not found')
    }
  } else {
    throw new Error('User ID is required')
  }
}
```

Good code:

```ts
interface User {
  role: string
  isDeleted: boolean
  emailVerified: boolean
}

/**
 * Loads a user and validates it with flat guard clauses.
 * @param userId The id of the user to load.
 * @param role The role the user must hold.
 * @returns The validated, active user.
 */
export async function validateUser(userId: string, role: string): Promise<User> {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const user = await database.users.findById(userId)

  assertActiveUser(user, role)

  return user
}

/**
 * Asserts the loaded user exists and is eligible for the role.
 * @param user The loaded user, or null when none was found.
 * @param role The role the user must hold.
 */
function assertActiveUser(user: User | null, role: string): asserts user is User {
  if (!user) {
    throw new Error('User not found')
  }

  if (user.isDeleted) {
    throw new Error('User is deleted')
  }

  if (user.role !== role) {
    throw new Error('Insufficient role')
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified')
  }
}
```

### 3. Untangle a complex static-only "helper" class

Bad code:

```ts
class PricingHelper {                        // unicorn/no-static-only-class + sonarjs/class-name (vague "Helper") + jsdoc/require-jsdoc
  static VAT = 0.2                           // no-restricted-syntax: static property

  static calc(t: string, qty: number, code: string, member: boolean): number {  // complexity + sonarjs/cognitive-complexity + no-restricted-syntax (static method) + id-length ('t')
    let price = 0

    if (t === 'book') {
      price = 10
    } else if (t === 'game') {
      price = 40
    } else if (t === 'film') {
      price = 20
    } else {
      price = 5
    }

    let total = price * qty

    if (qty > 100) {
      total = total * 0.8
    } else if (qty > 50) {
      total = total * 0.9
    } else if (qty > 10) {
      total = total * 0.95
    }

    if (member) {
      if (code === 'GOLD') {
        total = total * 0.85
      } else if (code === 'SILVER') {
        total = total * 0.9
      }
    }

    if (total > 1000) {
      total = total - 50
    }

    return total + total * PricingHelper.VAT
  }
}
```

Good code:

```ts
interface Order {
  type: string
  quantity: number
  couponCode: string
  isMember: boolean
}

/** Prices catalogue orders including quantity, membership discounts, and VAT. */
export class PricingCalculator {
  private readonly vatRate = 0.2

  private readonly basePrices: Record<string, number> = { book: 10, game: 40, film: 20 }

  private readonly memberCoupons: Record<string, number> = { GOLD: 0.85, SILVER: 0.9 }

  private readonly bulkTiers = [
    { min: 100, rate: 0.8 },
    { min: 50, rate: 0.9 },
    { min: 10, rate: 0.95 },
  ]

  /**
   * Computes the final price of an order including discounts and VAT.
   * @param order The order to price.
   * @returns The final price with VAT applied.
   */
  price(order: Order): number {
    const subtotal = this.subtotal(order)
    const discounted = this.applyDiscounts(subtotal, order)

    return this.withVat(discounted)
  }

  /**
   * Computes the pre-discount subtotal for an order.
   * @param order The order to price.
   * @returns The base price multiplied by quantity.
   */
  private subtotal(order: Order): number {
    const base = this.basePrices[order.type] ?? 5

    return base * order.quantity
  }

  /**
   * Applies quantity and membership discounts to a subtotal.
   * @param subtotal The pre-discount subtotal.
   * @param order The order being priced.
   * @returns The discounted amount.
   */
  private applyDiscounts(subtotal: number, order: Order): number {
    const afterQuantity = subtotal * this.quantityRate(order.quantity)
    const afterMember = afterQuantity * this.memberRate(order)

    return afterMember > 1000 ? afterMember - 50 : afterMember
  }

  /**
   * Resolves the quantity discount rate for an order size.
   * @param quantity The number of items ordered.
   * @returns A multiplier between 0 and 1.
   */
  private quantityRate(quantity: number): number {
    const tier = this.bulkTiers.find(entry => quantity > entry.min)

    return tier?.rate ?? 1
  }

  /**
   * Resolves the membership coupon rate for an order.
   * @param order The order being priced.
   * @returns A multiplier between 0 and 1.
   */
  private memberRate(order: Order): number {
    if (!order.isMember) {
      return 1
    }

    return this.memberCoupons[order.couponCode] ?? 1
  }

  /**
   * Adds VAT to an amount.
   * @param amount The pre-VAT amount.
   * @returns The amount including VAT.
   */
  private withVat(amount: number): number {
    return amount + amount * this.vatRate
  }
}
```


## Customization

Normally you only need to import the preset:

```js
// eslint.config.js
import config from 'agent-eslint-config'

export default config()
```

### Configuring & overriding rules

You can also configure each integration individually. The config supports the default [`antfu` options](https://github.com/antfu/eslint-config#customization), plus the one bespoke `alias` option documented below.

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


The `config` factory function also accepts any number of arbitrary custom config overrides:

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

Certain rules are only enabled in specific files. For example, `ts/*` rules are only enabled in `.ts` files, and `vue/*` rules are only enabled in `.vue` files. If you want to override those rules, you need to specify the file extension:

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

`config()` returns a [composer object](https://github.com/antfu/eslint-flat-config-utils#composer) whose methods you can chain to compose the config even more flexibly:

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

The `alias` option configures the custom `prefer-alias` rule, which rewrites relative imports that reach into your source directory (e.g. `../services/user`) into an aliased form (e.g. `@/services/user`).

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

## Included Rules

Layered on top of the full `@antfu/eslint-config` base, this package explicitly configures **82 rules** across nine groups (plus the layered `@typescript-eslint` `strictTypeChecked` preset). Every rule listed below is `error`-level and overridable via the customization mechanisms above. These rules are emitted *before* any user config, so your own `{ files, rules }` overrides always win last.

> **Prefix note.** Every `@typescript-eslint/*` rule is emitted under the `ts/` prefix, because `antfu` registers the `typescript-eslint` plugin under the `ts` namespace. Use `ts/`, not `@typescript-eslint/`, in your overrides.

### Complexity

Aggressive size and complexity thresholds from ESLint core plus SonarJS.

| Rule | Description |
| --- | --- |
| `complexity` | Cyclomatic complexity ≤ 10 per function (`[error, 10]`). |
| `max-depth` | Block nesting depth ≤ 2 (`[error, 2]`). |
| `max-lines-per-function` | ≤ 40 code lines per function (skips blanks/comments). |
| `max-statements` | ≤ 10 statements per function (`[error, 10]`). |
| `max-lines` | ≤ 150 code lines per file (skips blanks/comments). |
| `max-nested-callbacks` | Callback nesting depth ≤ 3 (`[error, 3]`). |
| `max-params` | ≤ 3 function parameters (`[error, 3]`). |
| `sonarjs/cognitive-complexity` | Cognitive complexity ≤ 4 per function (`[error, 4]`). |

### SonarJS

35 rules from `eslint-plugin-sonarjs`, grouped by concern. (The three SonarJS naming rules live in the Naming group and `sonarjs/cognitive-complexity` lives in the Complexity group.)

**Control flow**

| Rule | Description |
| --- | --- |
| `sonarjs/nested-control-flow` | Limits nesting depth of control-flow statements to 2. |
| `sonarjs/too-many-break-or-continue-in-loop` | Forbids multiple `break`/`continue` in a loop. |
| `sonarjs/elseif-without-else` | Requires a closing `else` after an `else if` chain. |
| `sonarjs/no-nested-conditional` | Forbids nested ternary/conditional expressions. |
| `sonarjs/no-same-line-conditional` | Forbids conditionals sharing a line. |
| `sonarjs/conditional-indentation` | Enforces consistent indentation of conditionals. |

**Dead code & redundancy**

| Rule | Description |
| --- | --- |
| `sonarjs/no-all-duplicated-branches` | Forbids conditionals whose branches are all identical. |
| `sonarjs/no-duplicated-branches` | Forbids duplicated branches in conditionals/switch. |
| `sonarjs/no-dead-store` | Forbids assignments whose value is never read. |
| `sonarjs/no-redundant-assignments` | Forbids assignments that duplicate the existing value. |
| `sonarjs/no-identical-functions` | Forbids duplicate function bodies (≥ 3 lines). |
| `sonarjs/no-useless-catch` | Forbids `catch` blocks that only rethrow. |
| `sonarjs/no-useless-increment` | Forbids increments whose result is unused. |
| `sonarjs/useless-string-operation` | Forbids no-op string operations. |
| `sonarjs/prefer-immediate-return` | Prefers returning an expression over assign-then-return. |

**Nesting & assignments**

| Rule | Description |
| --- | --- |
| `sonarjs/no-nested-assignment` | Forbids assignments nested inside expressions. |
| `sonarjs/no-nested-functions` | Forbids deeply nested function declarations. |
| `sonarjs/no-nested-incdec` | Forbids nested increment/decrement. |
| `sonarjs/no-parameter-reassignment` | Forbids reassigning function parameters. |
| `sonarjs/destructuring-assignment-syntax` | Enforces destructuring assignment syntax. |

**Loops**

| Rule | Description |
| --- | --- |
| `sonarjs/misplaced-loop-counter` | Forbids updating the wrong counter in a loop. |
| `sonarjs/updated-loop-counter` | Forbids mutating a loop counter in the body. |

**Functions & declarations**

| Rule | Description |
| --- | --- |
| `sonarjs/no-function-declaration-in-block` | Forbids function declarations inside blocks. |
| `sonarjs/no-globals-shadowing` | Forbids shadowing global identifiers. |
| `sonarjs/no-fallthrough` | Forbids switch-case fallthrough. |
| `sonarjs/no-reference-error` | Flags likely `ReferenceError`s (use-before-define). |
| `sonarjs/no-unthrown-error` | Flags `Error` objects created but never thrown. |
| `sonarjs/prefer-type-guard` | Prefers type-guard functions over inline type checks. |

**Promises & async**

| Rule | Description |
| --- | --- |
| `sonarjs/no-try-promise` | Forbids `try/catch` around a Promise without `await`. |

**Security**

| Rule | Description |
| --- | --- |
| `sonarjs/no-hardcoded-ip` | Forbids hardcoded IP addresses. |
| `sonarjs/no-hardcoded-passwords` | Forbids hardcoded passwords. |
| `sonarjs/no-hardcoded-secrets` | Forbids hardcoded secrets/tokens. |
| `sonarjs/os-command` | Flags risky OS command execution. |

**Testing**

| Rule | Description |
| --- | --- |
| `sonarjs/no-skipped-tests` | Forbids skipped tests (`.skip`). |
| `sonarjs/stable-tests` | Forbids unstable/non-deterministic test patterns. |

### Unicorn

10 rules overridden on `eslint-plugin-unicorn` (registered by `antfu`).

| Rule | Description |
| --- | --- |
| `unicorn/catch-error-name` | Requires the caught error variable to be named `error` (`{ name: 'error' }`). |
| `unicorn/prefer-optional-catch-binding` | Prefers omitting the catch binding when it is unused. |
| `unicorn/consistent-destructuring` | Requires consistent destructuring of an object. |
| `unicorn/consistent-function-scoping` | Moves functions to the outermost scope that works. |
| `unicorn/custom-error-definition` | Enforces correct custom `Error` subclass definitions. |
| `unicorn/no-lonely-if` | Forbids an `if` as the only statement inside an `else`. |
| `unicorn/no-nested-ternary` | Forbids nested ternary expressions. |
| `unicorn/no-static-only-class` | Forbids classes containing only static members. |
| `unicorn/prefer-class-fields` | Prefers class fields over constructor assignment. |
| `unicorn/throw-new-error` | **Turned OFF** (conflicts with catch decorators). |

### Type-aware

Enables `@typescript-eslint`'s `strictTypeChecked` preset (emitted under the `ts/` prefix), which requires a resolvable `tsconfig.json`. On top of the preset, the package explicitly configures the following:

| Rule | Description |
| --- | --- |
| `no-never-return/no-never-return-type` | Bans functions whose resolved return type is `never` (throw-only wrappers); throw at the call site instead. Type-aware; ignores callback functions. |
| `ts/use-unknown-in-catch-callback-variable` | Forces `unknown` typing for the parameter of `.catch()` / promise-rejection callbacks. |
| `ts/only-throw-error` | Disallows throwing values that are not `Error` objects. |

**The `strictTypeChecked` preset.** This package enables the entire `@typescript-eslint` `strictTypeChecked` preset (~72 enabled type-aware rules, all emitted as `ts/*`). The preset also turns **off ~28 core ESLint rules** it supersedes with type-aware equivalents (e.g. core `no-throw-literal`, `no-unused-vars`, `require-await`, `no-implied-eval` — use the `ts/*` versions instead), in addition to the 5 `antfu`-enabled rules listed under [Rules deliberately turned off](#rules-deliberately-turned-off). The preset is not enumerated in full here because its exact membership is version-dependent, but notable rules it brings in include:

- `ts/no-explicit-any`, `ts/no-unsafe-argument`, `ts/no-unsafe-assignment`, `ts/no-unsafe-call`, `ts/no-unsafe-member-access`, `ts/no-unsafe-return`
- `ts/no-floating-promises`, `ts/no-misused-promises`, `ts/await-thenable`, `ts/require-await`
- `ts/no-unnecessary-condition`, `ts/no-unnecessary-type-assertion`, `ts/no-non-null-assertion`
- `ts/restrict-template-expressions`, `ts/restrict-plus-operands`, `ts/no-base-to-string`
- `ts/unbound-method`, `ts/no-confusing-void-expression`, `ts/ban-ts-comment`

The following notable type-checked rules are configured or emphasized by this package (the last two are set in the Stylistic group but still require type information): `ts/use-unknown-in-catch-callback-variable`, `ts/only-throw-error`, `ts/consistent-type-definitions`, `ts/class-methods-use-this`.

### Naming

5 rules from `eslint-plugin-sonarjs` and `eslint-plugin-validate-filename`. All ban the vague terms `util`, `common`, `helper`, and `function` (in any case).

| Rule | Description |
| --- | --- |
| `validate-filename/naming-rules` | Forbids `util`/`common`/`helper`/`function` in `*.ts` file names (glob-scoped to `**/*.ts`). |
| `sonarjs/class-name` | Class names must be PascalCase and must not contain the vague terms. |
| `sonarjs/function-name` | Function names must be camelCase/PascalCase and must not contain the vague terms. |
| `sonarjs/variable-name` | Variable names must be camelCase/PascalCase/UPPER_SNAKE and must not contain the vague terms. |
| `test/prefer-lowercase-title` | **Turned OFF** (disables `antfu`'s lowercase test-title default). |

### Stylistic

12 rules from ESLint core, `@typescript-eslint` (emitted as `ts/*`), and `perfectionist`.

| Rule | Description |
| --- | --- |
| `ts/consistent-type-definitions` | Requires `interface` over `type` for object types (`[error, 'interface']`). |
| `ts/class-methods-use-this` | Requires class methods to use `this` (with override/interface exceptions). |
| `no-warning-comments` | Forbids `jscpd:ignore-*` marker comments. |
| `prefer-const` | Requires `const` where a binding is never reassigned. |
| `init-declarations` | Requires variables to be initialized at declaration (`[error, 'always']`). |
| `id-length` | Identifier length must be 3–35 characters, with exceptions (`i`, `j`, `k`, `x`, `y`, `z`, `_`, `id`, `on`, `in`, `of`). |
| `padding-line-between-statements` | Requires blank lines after `const`/`let` declarations, before `return`, and around control-flow blocks. |
| `preserve-caught-error` | Requires preserving the original caught error (`cause`) when rethrowing. |
| `no-restricted-syntax` | Bans static methods and static properties (use instance members). |
| `ts/consistent-type-imports` | **Turned OFF** (NestJS DI needs value imports). |
| `perfectionist/sort-named-imports` | **Turned OFF** (do not sort named imports). |
| `class-methods-use-this` | **Turned OFF** (replaced by the `ts/` variant above). |

### Promise

1 rule from `eslint-plugin-promise`.

| Rule | Description |
| --- | --- |
| `promise/prefer-await-to-then` | Prefers `await` over `.then()`/`.catch()` chaining. |

### JSDoc

6 rules overridden on `eslint-plugin-jsdoc` (registered by `antfu`).

| Rule | Description |
| --- | --- |
| `jsdoc/require-jsdoc` | Requires JSDoc on function/method/class declarations, constructors, getters, and setters (not on arrows or function expressions). |
| `jsdoc/require-description` | Requires a description in JSDoc blocks. |
| `jsdoc/require-param` | Requires a `@param` for each parameter. |
| `jsdoc/require-returns` | Requires a `@returns` for functions that return a value. |
| `jsdoc/check-param-names` | Requires `@param` names to match the signature. |
| `jsdoc/no-blank-blocks` | Forbids empty JSDoc blocks. |

### Custom

Rules implemented by this package's own plugins.

| Rule | Fixable | Description |
| --- | --- | --- |
| `step-down-rule/step-down` | No | Enforces top-down call structure — callers appear before callees. Decorator factories defined after use are allowed. |
| `alias/prefer-alias` | Yes (`code`) | Rewrites relative imports that reach into the source dir (`../foo`) to the alias form (`@/foo`). Option-gated: omitted entirely when `config({ alias: false })`. |
| `no-never-return/no-never-return-type` | No | Bans functions whose resolved return type is `never`. Type-aware; also listed under [Type-aware](#type-aware) above. |

## FAQ

### How to disable type-aware linting

This linter includes a type-aware layer — `@typescript-eslint`'s `strictTypeChecked` preset, extra type-checked rules, and the custom `no-never-return-type` rule. As a result, it requires a resolvable `tsconfig.json` in the project root.

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
