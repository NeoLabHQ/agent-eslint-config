---
name: ESLint Flat-Config Package Authoring (antfu-based)
description: How to build a publishable, drop-in-compatible ESLint flat-config package layered on @antfu/eslint-config, with typed custom rules and vitest-based rule testing
---

# ESLint Flat-Config Package Authoring (antfu-based)

## Overview

Enables building an npm package that wraps `@antfu/eslint-config`, adds opinionated rule groups (sonarjs/unicorn/jsdoc/custom plugins), and stays a drop-in-compatible extension of antfu's own types/composer — plus authoring and testing custom typed ESLint rules and packaging the result correctly with `tsdown`.

---

## Key Concepts

- **`OptionsConfig`**: antfu's public options interface (`typescript`, `vue`, `react`, `stylistic`, `ignores`, …) — extend it, don't reinvent it.
- **`TypedFlatConfigItem`**: antfu's flat-config item type (`Omit<ConfigWithExtends, 'plugins'|'rules'> & {...}`), sourced from `eslint-flat-config-utils`, re-exported by antfu.
- **`FlatConfigComposer`**: the chainable object (`.append()`, `.override()`, `.renamePlugins()`) that `antfu()` returns — **not re-exported by `@antfu/eslint-config`**, lives in `eslint-flat-config-utils`.
- **Type-aware linting**: requires `parserOptions.projectService` (or legacy `project`) so `@typescript-eslint` rules and custom rules can query the TS type checker.
- **Composition/override ordering**: in flat config, later `{ files, rules }` entries win on matching rules (last-match-wins per rule key) — this is how "opinionated defaults, user-overridable" is achieved without a bespoke API.

---

## Documentation & References

| Resource | Description | Link |
|---|---|---|
| antfu/eslint-config README | Composition API (`.append`, `.override`, `combine()`), options | https://github.com/antfu/eslint-config/blob/main/README.md |
| antfu/eslint-config `src/types.ts` | Exact `OptionsConfig`/`TypedFlatConfigItem` shapes | https://github.com/antfu/eslint-config/blob/main/src/types.ts |
| antfu/eslint-config `src/factory.ts` | `antfu()` signature, `FlatConfigComposer` import source | https://github.com/antfu/eslint-config/blob/main/src/factory.ts |
| antfu/eslint-config `src/configs/typescript.ts` | Real-world `projectService`/`tsconfigRootDir` handling | https://github.com/antfu/eslint-config/blob/main/src/configs/typescript.ts |
| typescript-eslint Custom_Rules docs | `ESLintUtils.RuleCreator` pattern | https://typescript-eslint.io/developers/custom-rules |
| typescript-eslint Rule_Tester docs | `RuleTester` + vitest integration, type-aware test setup | https://typescript-eslint.io/packages/rule-tester |
| tsdown package-exports docs | `exports: true` behavior and its limits | https://tsdown.dev/options/package-exports |

---

## Recommended Libraries & Tools

| Name | Purpose | Maturity | Notes |
|---|---|---|---|
| `@antfu/eslint-config` | Base flat-config factory + types to extend | Stable, active | Peer `eslint: ^9.10.0 \|\| ^10.0.0`; own `unicorn` dep is already `>=10.4`-only — see pitfall below |
| `typescript-eslint` / `@typescript-eslint/utils` / `@typescript-eslint/rule-tester` | Type-aware presets + typed custom-rule authoring/testing | Stable, active | Keep all three on the **same** version (monorepo lockstep) |
| `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-promise` | Extra opinionated rule groups | Stable, active | See peer-dep matrix below for unicorn |
| `eslint-plugin-validate-filename` | Filename-naming rule (`naming-rules`) | Small/low-traffic (single maintainer) but current API unchanged | Rule schema: `{ rules: [{ target, case?, patterns?, excludes? }] }` |
| `tsdown` (`dts.tsgo: true`, `exports: true`) | ESM build + `.d.mts` generation + auto `exports` map | Stable, active | Does **not** rewrite legacy top-level `main`/`module`/`types` fields unless `exports.legacy: true` |

### Recommended Stack

Keep the repo's existing choices (`tsdown`, `vitest`, TS `^6`). Add `typescript-eslint`, `@typescript-eslint/utils`, `eslint-plugin-{sonarjs,unicorn,jsdoc,validate-filename,promise}` as runtime `dependencies` (matches antfu's own pattern of shipping its rule-plugin deps directly, not as peers); `eslint`, `@typescript-eslint/rule-tester` as `devDependencies` only (needed to run tests/demo, not required transitively by consumers beyond the `eslint` peer).

---

## Patterns & Best Practices

### Thin factory over antfu, with our rules injected before user configs

**When to use**: building a "preset that's still just antfu underneath."
**Trade-offs**: gives full override power to consumers via native `{ files, rules }` items; requires discipline to put *all* our rule blocks before `...userConfigs` in the call to `antfu()`.
```ts
import antfu from '@antfu/eslint-config'
import type { OptionsConfig, TypedFlatConfigItem } from '@antfu/eslint-config'

export interface AgentConfigOptions extends OptionsConfig {
  alias?: false | { prefix?: string, sourceDir?: string }
}

export default function config(options: AgentConfigOptions = {}, ...userConfigs: TypedFlatConfigItem[]) {
  return antfu(options, ...buildOurConfigs(options), ...userConfigs)
}
```

### Avoiding duplicate `@typescript-eslint` plugin registration

**When to use**: appending `tseslint.configs.strictTypeChecked` (or any tseslint preset) on top of a config that already registers the TS plugin (antfu's `typescript` config does).
**Trade-offs**: skipping the first array element is a documented-safe technique (that element is pure plugin/parser registration, no rules) but is easy to forget on refactor — cover it with a test.
```ts
import tseslint from 'typescript-eslint'

const typeAwareConfig = [
  ...tseslint.configs.strictTypeChecked.slice(1), // [0] just re-registers plugin+parser
  { languageOptions: { parserOptions: { projectService: true } } }, // omit tsconfigRootDir -> defaults to process.cwd()
]
```

### Typed custom rule + vitest-integrated RuleTester

**When to use**: every custom rule in the package (AST-only or type-aware).
**Trade-offs**: `ESLintUtils.RuleCreator` requires a docs-URL factory function; type-aware rules need a real `tsconfig.json` fixture for `RuleTester`.
```ts
import { ESLintUtils } from '@typescript-eslint/utils'

const createRule = ESLintUtils.RuleCreator(name => `https://github.com/<org>/<repo>/blob/main/docs/rules/${name}.md`)

export const rule = createRule({
  name: 'my-rule',
  meta: { type: 'problem', docs: { description: '...' }, messages: { bad: '...' }, schema: [] },
  defaultOptions: [],
  create(context) { return { /* AST visitors, or use ESLintUtils.getParserServices(context) for type info */ } },
})
```
```ts
// tests/setup.ts (or top of each rule test file)
import * as vitest from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

// type-aware rule only:
new RuleTester({
  languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
})
```

---

## Common Pitfalls & Solutions

| Issue | Impact | Solution |
|---|---|---|
| `FlatConfigComposer` imported from `@antfu/eslint-config` | TS "no exported member" error | Import it from `eslint-flat-config-utils` directly, or avoid naming it and use `ReturnType<typeof antfu>` |
| `tsconfigRootDir: import.meta.dirname` left in a config that ships as a dependency | Resolves to a path inside the *package's* `node_modules`, not the consumer's project → type-aware linting breaks for every consumer | Omit `tsconfigRootDir` (defaults to `process.cwd()`) — matches antfu's own convention |
| Appending a full `tseslint.configs.*TypeChecked` array after a config that already registers `@typescript-eslint` | Plugin registered under duplicate namespace → duplicated lint reports | `.slice(1)` off the preset array before spreading |
| `eslint-plugin-unicorn` pinned to latest | Peer dep silently requires `eslint>=10.4`, breaking ESLint-9 consumers even though antfu itself still declares `^9.10.0` support | Pin `eslint-plugin-unicorn` to the last version supporting `eslint>=9.38.0` (`65.0.1` as of 2026-07), or deliberately narrow this package's own `eslint` peerDependency and document it |
| `package.json` top-level `"types"` field left stale after switching to ESM-only + `tsdown exports:true` | Points at a non-existent `.d.cts` file while actual output is `.d.mts`; breaks type resolution for tools that don't read `exports` | After every build, verify `package.json`'s `exports`/`types` fields match real `dist/` output; `exports:true` regenerates the `exports` map but **not** legacy top-level fields (needs `exports.legacy: true` for that) |
| Hard-pinning exact dependency versions when `.npmrc` has `min-release-age=<N>` | `npm install` fails on the newest version if it's younger than N days | Re-run `npm view <pkg> time --json` immediately before installing; prefer semver ranges over exact pins so npm can auto-select an age-eligible version |
| Testing custom rules without the vitest↔RuleTester shim | `RuleTester.run()` throws ("Cannot find `describe`") under vitest | Set `RuleTester.{it,itOnly,describe,afterAll} = vitest.*` before calling `.run()` |

---

## Recommendations

1. Extend `OptionsConfig` (imported from `@antfu/eslint-config`) rather than redefining it — keeps drop-in compatibility with antfu's own consumers/tooling (e.g. antfu's VS Code extension, `eslint-config-inspector`).
2. Put every internal rule-group config **before** `...userConfigs` in the call to `antfu(...)` — this is the entire override guarantee; verify it with a factory test asserting object-identity ordering, not just "it doesn't crash."
3. Treat `.npmrc`'s `min-release-age` as a live constraint, not a one-time check — re-verify package ages right before `npm install` runs, since the research and implementation steps may be days apart.
4. Rebuild and manually inspect `package.json` after any `tsdown` config change — `exports: true` is not a substitute for reviewing the generated file once.

---

## Implementation Guidance

### Configuration

- `tsdown.config.ts` already has `dts: { tsgo: true }, exports: true` — keep, but check `package.json` after each build.
- `peerDependencies`: `{ "eslint": "^9.10.0 || ^10.0.0" }` (only valid if `eslint-plugin-unicorn` stays on `65.0.1`; otherwise narrow to `^10.4.0`).

### Integration Points

- Public entry (`src/index.ts`) default-exports the factory; consumers call `config(options?, ...userConfigs)` exactly like `antfu(...)`.
- Each `configs/*.ts` module is `(resolvedOptions) => TypedFlatConfigItem[]`, independently unit-testable without invoking the full factory.

---

## Code Examples

### Example 1: Modular rule-group builder

```ts
// configs/sonarjs.ts
import sonarjs from 'eslint-plugin-sonarjs'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'

export function sonarjsConfig(): TypedFlatConfigItem[] {
  return [{ plugins: { sonarjs }, rules: { 'sonarjs/cognitive-complexity': ['error', 4] } }]
}
```

### Example 2: Factory test asserting override ordering (no hardcoded rule names)

```ts
import { describe, expect, it } from 'vitest'
import config from '../src/index'

it('lets user configs override ours (last-match-wins)', () => {
  const sentinel = { files: ['**/*.ts'], rules: { 'no-console': 'off' } }
  const items = config({}, sentinel)

  expect(items.at(-1)).toBe(sentinel) // appended last per antfu(...) contract
})
```

---

## Sources & Verification

| Source | Type | Last Verified |
|---|---|---|
| github.com/antfu/eslint-config (`types.ts`, `factory.ts`, `configs/typescript.ts`) | Official (primary source) | 2026-07-04 |
| typescript-eslint.io docs via context7 (`/typescript-eslint/typescript-eslint`) | Official | 2026-07-04 |
| tsdown.dev docs via context7 (`/rolldown/tsdown`) | Official | 2026-07-04 |
| npm registry (`npm view <pkg> version\|time\|peerDependencies`) | Official/primary | 2026-07-04 |
| github.com/hiro08gh/eslint-plugin-validate-filename README | Community (single maintainer) | 2026-07-04 |
| Web search on npm `min-release-age` semantics | Community (gist/blog, cross-checked against npm CLI behavior) | 2026-07-04 |

---

## Changelog

| Date | Changes |
|---|---|
| 2026-07-04 | Initial creation for task: Rewrite Example Config as ESLint Package |
