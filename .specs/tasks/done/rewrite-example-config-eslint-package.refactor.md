---
title: Rewrite Example Config as ESLint Package
---

> **Required Skill**: You MUST use and analyse `eslint-config-authoring` skill before doing any modification to task file or starting implementation of it!
>
> Skill location: `.claude/skills/eslint-config-authoring/SKILL.md`

## Initial User Prompt

rewrite example config as eslint package

### Context

This project was initially setup, it not yet published:
- index.ts and test for it just dummy files, that should be rewritten
- src/eslint.*.mjs/cjs files was copy pasted from our company internal project. It should be used as basis for this package

### Goal

Create eslint package, simular to `@antfu/eslint-config`, so it can be use like this:

```js
// eslint.config.mjs
import config from 'agent-eslint-config'

export default config()
```

And provide all rules/plugins/settings that are currently provided by our eslint config.

### Requirements

- Config should be as extendable as antfu, better even use same types, so it can be drop in replacement for antfu config
- parts that obviusly should be configured at project level, should be kept configurable at project level, for example: `ignores: [...]`. It shouldn't be inside of config.
- Inside of config should be used antfu directly, together with sonar and unicorn
- all files in src/ should be in typescript
- test as much as possible, using vitest
- update readme with usage instructions, rules that covered and what can be configured 

### Target Approach

Decided during brainstorming. Architecture: **modular rule-group builders composed by a thin factory** (`antfu()` stays the untouched base; our opinionated blocks layer on top, then user configs).

#### Public API & extensibility contract

- Entry `src/index.ts` exports a default factory: `config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem[])`.
- **Full antfu passthrough + drop-in.** `AgentConfigOptions extends OptionsConfig` from `@antfu/eslint-config`, so every antfu toggle (`typescript`, `vue`, `react`, `formatters`, `stylistic`, `ignores`, `rules`, …) passes through unchanged. Reuse antfu's own types (`OptionsConfig`, `TypedFlatConfigItem`). Return antfu's `FlatConfigComposer` so `.append()`/`.override()` chaining still works.
- **Extensibility is via native ESLint flat-config `{ files, rules }` items**, not a bespoke API. Users disable a rule, downgrade to `warn`, retune a rule's options (e.g. `complexity`, `max-lines`), or scope rules to globs (e.g. `**/*.spec.ts`) by passing standard config items as `...userConfigs`.
- **Composition order is the override guarantee:** `antfu(antfuOptions, ...OUR_configs, ...userConfigs)`. All our opinionated rules — including global/root rules with no `files` restriction — are emitted **before** user configs, so any user `{ files, rules }` item wins by last-match-wins cascade. Nothing in our config is locked.
- **Only one typed extra option** beyond antfu's: `alias?: false | { prefix?: string, sourceDir?: string }` (default `{ prefix: '@', sourceDir: 'src' }`). It exists because prefix/sourceDir are read *inside* the root-alias rule (behavior, not severity) and can't be expressed as a rule override. No group-toggle booleans, no `complexity` option object — those are redundant with native overrides.
- **Drop the hardcoded `ignores`** list from the copied config (`*.spec.ts`, `*.test.ts`, `*.md`, `smoke-tests/**`, etc.). Consumers own ignores via antfu passthrough.

#### Type-aware linting

- The type-aware layer (`tseslint.configs.strictTypeChecked` + our extra `@typescript-eslint` type-checked rules + the custom `no-never-return-type` rule) is **always on**: force `parserOptions.projectService: true` on TS files. Remove the copied config's `tsconfigRootDir: import.meta.dirname` (which pointed at this package and would break once installed as a dependency).
- Tradeoff to document in README: type-aware linting is always enabled, so a consumer in a setup without a resolvable `tsconfig.json` will get parser errors — document the escape hatch.

#### File layout (all TypeScript under `src/`)

```
src/
  index.ts                # config() factory + type re-exports
  types.ts                # AgentConfigOptions extends antfu OptionsConfig
  configs/
    type-aware.ts         # strictTypeChecked + our @typescript-eslint type rules
    sonarjs.ts            # sonarjs plugin + all sonar rules
    unicorn.ts            # unicorn overrides
    jsdoc.ts              # jsdoc group
    naming.ts             # sonar naming + validate-filename (ban vague names)
    complexity.ts         # complexity/max-* thresholds (opinionated defaults)
    stylistic.ts          # padding-line-between-statements, id-length, etc.
    custom.ts             # wires the 3 custom plugins + their rules
  plugins/
    step-down.ts          # ported from eslint.plugin.step-down-rule.mjs
    root-alias.ts         # ported from eslint.plugin.root-alias.mjs; {prefix, sourceDir} via rule options schema
    no-never-return-type.ts # ported from eslint.plugin.no-never-return-type.cjs
```

Each `configs/*.ts` builder is a function `(resolvedOptions) => TypedFlatConfigItem[]`, independently unit-testable. Delete the original `src/eslint.*.mjs/cjs` files and the dummy `src/index.ts` `fn()` / `tests/index.test.ts`.

#### Custom plugins port

- Author all three with `@typescript-eslint/utils` `ESLintUtils.RuleCreator` for typed `context`/`node`/`messageId` (the `no-never-return-type` rule already uses this pattern; extend to all three).
- `no-never-return-type.ts`: near-direct port of the `.cjs`; CJS `require` → ES imports; repoint the `RuleCreator` docs URL from `decision-engine` to this repo. Stays in the type-aware layer.
- `root-alias.ts`: hardcoded `'@'`/`'src'` become a rule options schema `[{ prefix, sourceDir }]` fed from the `alias` factory option; keep `fixable: 'code'` autofix.
- `step-down.ts`: faithful port with types; behavior unchanged (most intricate — scope-walking).
- Each plugin still exported as a `{ meta, rules }` flat-config plugin object.

#### Dependencies, build & packaging

- Add as **runtime `dependencies`** (as antfu does): `@antfu/eslint-config`, `typescript-eslint`, `@typescript-eslint/utils`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-validate-filename`, `eslint-plugin-promise`.
- **Peer dep:** `eslint` (>=9, flat config).
- Resolve exact versions at implementation time honoring `.npmrc` `min-release-age=7`.
- Build stays `tsdown` (already configured: `dts.tsgo`, `exports: true`), ESM-only, `src/index.ts` → `dist/index.mjs` + `dist/index.d.cts`. Verify consumer type resolution.
- Package name is **`agent-eslint-config`** (correct in `package.json`); fix the README install command which wrongly says `@neolabhq/agent-eslint-config`.
- **No dogfooding** of the config on our own source.

#### Testing (vitest)

```
tests/
  plugins/
    step-down.test.ts
    root-alias.test.ts            # incl. autofix output + prefix/sourceDir options
    no-never-return-type.test.ts  # type-aware; points at a tsconfig fixture
  factory.test.ts
  rule-set.snapshot.test.ts
  fixtures/tsconfig.json
demo/                             # E2E fixture project
  package.json                    # eslint + agent-eslint-config via local file: ref
  eslint.config.mjs               # export default config()
  tsconfig.json
  fixtures/{good.ts,bad.ts}
```

- **Custom rule unit tests:** `@typescript-eslint/rule-tester` `RuleTester` with vitest integration; valid/invalid fixtures for each rule. `no-never-return-type` points `parserOptions` at `tests/fixtures/tsconfig.json`.
- **Factory tests (no hardcoded rule names):** assert `config()` resolves to a flat-config array and is antfu's composer; assert **override ordering** by object identity/index (a sentinel user config appears after our configs); assert **antfu passthrough** yields strictly more config items when an option like `vue: true` is enabled; assert `alias: false` vs default changes the config set. *Which* rules/severities are enabled is left to the snapshot, so rule churn doesn't break factory tests.
- **Snapshot test:** serialize resolved `{ ruleName: severity }` map to catch unintended rule/severity drift in review.
- **Demo E2E:** `demo/` depends on the package via local `file:` ref; a `test:e2e` script builds the package then runs `eslint` in `demo/`, asserting `good.ts` is clean and `bad.ts` reports the expected rule IDs.

#### README

Update with: install (`agent-eslint-config`), basic usage, the extensibility model (native `{ files, rules }` overrides + ordering guarantee), the `alias` option, the always-on type-aware tradeoff + escape hatch, covered rule groups/plugins, and the existing `jscpd`/`knip` recommendations.

# Description

This task turns the current copy-pasted ESLint configuration into a real, installable npm package named `agent-eslint-config`. Today `src/` holds a hardcoded `eslint.config.mjs` and three untyped custom-plugin files (`.mjs`/`.cjs`) lifted from an internal project, while `src/index.ts` and `tests/index.test.ts` are dummy tsdown-template scaffolding. That artifact is not consumable by other projects: it carries a project-specific `ignores` list, a `tsconfigRootDir` pinned to this repo, and rules that only work in place. The work re-expresses the same opinionated ruleset as a thin factory over an untouched `@antfu/eslint-config` base, composed from independently unit-testable rule-group builders plus three custom plugins ported to TypeScript.

The value is reuse and adoption. The config exists to force LLM coding agents to write low-complexity, highly readable code; packaging it makes that guardrail reusable across every project instead of a copy-paste that drifts per repo. By reusing antfu's own types (`OptionsConfig`, `TypedFlatConfigItem`) and returning antfu's `FlatConfigComposer`, the package is a drop-in replacement for antfu, giving that ecosystem near-zero switching cost. Extensibility is intentionally the native ESLint flat-config mechanism — consumers disable, downgrade, retune, or glob-scope any rule by passing standard `{ files, rules }` items after the options; composition order (`antfu(options, ...OUR_configs, ...userConfigs)`) is the override guarantee, so nothing is locked. The only bespoke typed option is `alias` (default `{ prefix: '@', sourceDir: 'src' }`, or `false` to disable), because prefix/sourceDir are read inside the root-alias rule's behavior and cannot be expressed as a severity override.

Beneficiaries: consumer developers (install once, override anything), LLM agents whose output is gated by the strict rules, and maintainers who get a modular structure resistant to rule churn. Key constraints: the type-aware layer is always on (`parserOptions.projectService: true`, with the repo-specific `tsconfigRootDir` removed), so consumers without a resolvable `tsconfig.json` need a documented escape hatch; all source is TypeScript; the build stays `tsdown` ESM-only (`dist/index.mjs` + `dist/index.d.cts`); plugin/antfu packages are runtime `dependencies` with `eslint` as the only peer, versions honoring `.npmrc` `min-release-age=7`; the config is not dogfooded on its own source.

**Scope**:

- Included: default-export factory `config(options?, ...userConfigs)` in `src/index.ts`; typed `AgentConfigOptions extends OptionsConfig` in `src/types.ts`; modular rule-group builders under `src/configs/`; three custom plugins ported to TypeScript under `src/plugins/`; the `alias` option; always-on type-aware layer; removal of the copied `eslint.*.mjs/cjs` files, the hardcoded `ignores` list, the `tsconfigRootDir` pin, and the dummy `fn()`/`tests/index.test.ts`; dependency and packaging updates; README rewrite; a vitest suite (per-rule RuleTester tests, factory tests, rule→severity snapshot) plus a `demo/` end-to-end fixture project.
- Excluded: publishing/releasing to npm; CI/CD setup; any new rules beyond the current ruleset; dogfooding the config on this package's own source; boolean group-toggle options or a `complexity` option object (explicitly rejected as redundant with native overrides); non-flat (eslintrc) config support.

**User Scenarios**:

1. **Primary Flow**: A consumer installs `agent-eslint-config` plus the `eslint` peer, writes `import config from 'agent-eslint-config'; export default config()` in `eslint.config.mjs`, and the full opinionated ruleset (including the type-aware and custom rules) applies to their TypeScript files.
2. **Alternative Flow**: The consumer sets antfu options (e.g. `config({ vue: true })`), tunes/disables the alias behavior (`config({ alias: { prefix: '~', sourceDir: 'app' } })` or `config({ alias: false })`), or appends native `{ files, rules }` items after the options to override, downgrade, or glob-scope any rule.
3. **Error Handling**: A consumer without a resolvable `tsconfig.json` hits type-aware parser errors; the README documents the escape hatch. Custom-rule violations (incorrect top-down ordering, a relative import that should use the alias, a never-returning function) are reported with their rule message.

---

## Acceptance Criteria

### Functional Requirements

- [X] **Factory returns a usable antfu composer**: The package default export is a factory that produces a working flat config.
  - Given: the package is built
  - When: `config()` is called and its result is resolved
  - Then: it returns antfu's `FlatConfigComposer` (supporting `.append()`/`.override()`), resolves to a non-empty flat-config array, and ESLint loads it without a configuration error on a TypeScript fixture project

- [X] **antfu passthrough / drop-in superset**: `AgentConfigOptions extends OptionsConfig` and every antfu option passes through unchanged.
  - Given: a baseline `config()` and a variant with an antfu option enabled
  - When: `config()` and `config({ vue: true })` are each resolved to arrays
  - Then: the option-enabled result contains strictly more config items than the baseline (verified without referencing any specific rule name)

- [X] **Override guarantee via composition order**: User configs passed after the options win by last-match-wins.
  - Given: a sentinel user config `{ files: [...], rules: {...} }` passed as a trailing argument
  - When: the resulting config array is inspected
  - Then: the sentinel appears after all of our emitted config items (by array index/object identity), and a user override of one of our rules (e.g. setting it to `off`) takes effect for the matched files

- [X] **`alias` option behavior**: The single bespoke option controls the root-alias rule.
  - Given: `config()` with default options, with `alias: false`, and with a custom `{ prefix, sourceDir }`
  - When: the config is resolved and the root-alias rule is exercised
  - Then: the root-alias rule is present by default with `{ prefix: '@', sourceDir: 'src' }`, is absent when `alias: false`, and uses the supplied `prefix`/`sourceDir` in its reports and autofix output when customized

- [X] **Custom rules ported and functioning**: All three custom plugins are ported to TypeScript and behave faithfully.
  - Given: valid and invalid code fixtures for `step-down`, `prefer-alias`, and `no-never-return-type` (the type-aware rule pointed at a tsconfig fixture)
  - When: each rule is run under RuleTester
  - Then: invalid fixtures report the expected messageId, valid fixtures produce no report, and `prefer-alias` autofix output matches the expected aliased import

- [X] **Type-aware linting is always on**: Type-checked rules apply without consumer opt-in.
  - Given: a TypeScript fixture project with a resolvable `tsconfig.json`
  - When: ESLint runs with `config()`
  - Then: the type-checked rules (including `no-never-return-type`) are active without the consumer enabling them, and no repo-specific `tsconfigRootDir` is pinned in the emitted config

- [X] **Full ruleset parity preserved**: No opinionated rules are lost in the rewrite.
  - Given: the resolved config
  - When: the enabled `{ ruleName: severity }` map is serialized and compared to a committed snapshot
  - Then: the snapshot matches, covering all original groups (sonarjs, unicorn, jsdoc, naming/validate-filename, complexity thresholds, stylistic/padding/id-length, ESLint core, no-restricted-syntax static bans, and the three custom rules)

- [X] **Legacy scaffolding removed**: The copied and dummy files no longer exist.
  - Given: the repository after the rewrite
  - When: `src/` and `tests/` are listed
  - Then: no `eslint.*.mjs`/`eslint.*.cjs` files remain, the dummy `fn()` export and `tests/index.test.ts` are gone, and the hardcoded project-specific `ignores` list is removed

- [X] **Consumer packaging and type resolution work**: The built package is importable with types.
  - Given: the package built via tsdown
  - When: the demo project imports the default export and its types are resolved
  - Then: `dist/index.mjs` and `dist/index.d.cts` exist and the demo resolves the default import and its types without error

- [X] **Demo end-to-end linting**: A local consumer project validates real behavior.
  - Given: a `demo/` project depending on the package via a local `file:` reference, with `good.ts` and `bad.ts` fixtures
  - When: the `test:e2e` script builds the package and runs ESLint in `demo/`
  - Then: `good.ts` reports zero errors and `bad.ts` reports the expected rule IDs

- [X] **README updated**: Documentation reflects the package contract.
  - Given: the updated README
  - When: it is read
  - Then: it shows the correct install command (`agent-eslint-config`, not `@neolabhq/agent-eslint-config`), basic usage, the native `{ files, rules }` override model and ordering guarantee, the `alias` option, the always-on type-aware tradeoff plus escape hatch, the covered rule groups/plugins, and the existing `jscpd`/`knip` recommendations

### Non-Functional Requirements

- [X] **Compatibility**: Targets ESLint 9+ flat config; `eslint` is the only peer dependency; antfu and all plugin packages are declared as runtime `dependencies`
- [X] **Packaging**: ESM-only build via tsdown producing `dist/index.mjs` + `dist/index.d.cts`
- [X] **Language**: All files under `src/` are TypeScript; the three custom rules are authored with `@typescript-eslint/utils` `ESLintUtils.RuleCreator`
- [X] **Versioning**: Resolved dependency versions honor `.npmrc` `min-release-age=7`
- [X] **Test coverage**: vitest suite covers each custom rule (valid/invalid via RuleTester), factory behavior (no hardcoded rule names), the rule→severity snapshot, and the `demo/` E2E flow

### Definition of Done

- [X] All acceptance criteria pass
- [X] Tests written and passing
- [X] Documentation (README) updated
- [X] Package builds and produces the expected `dist` artifacts

---

## Architecture

> Synthesized from: Skill `.claude/skills/eslint-config-authoring/SKILL.md`, Analysis `.specs/analysis/analysis-rewrite-example-config-eslint-package.md`, Scratchpad `.specs/scratchpad/5c1250d3.md`.

### Solution Strategy

**Architecture Pattern**: **Microkernel** (thin factory core + pluggable rule-group builders and custom-rule plugins), with an internal layering `types → configs → plugins → composition`. Chosen because ESLint flat config is itself a microkernel (engine + plugins) and this matches the skill's "thin factory over antfu, our rules injected before user configs" pattern; codebase precedent is the current `src/eslint.config.mjs`, which already composes antfu plus pluggable `{ plugins, rules }` blocks.

Re-express the copy-pasted `src/eslint.config.mjs` as a thin factory over an **untouched** `@antfu/eslint-config`, decomposed into 9 independently unit-testable rule-group builders (`src/configs/*.ts`) plus 3 typed custom-rule plugins (`src/plugins/*.ts`). The factory `config(options?, ...userConfigs)` resolves options, strips the single bespoke `alias` option, and calls `antfu(antfuOptions, ...ourConfigs, ...userConfigs)`, returning antfu's composer — making the package a drop-in antfu replacement whose every rule is overridable by native trailing `{ files, rules }` items via last-match-wins.

**Key Decisions**:
1. **Microkernel thin-factory** — matches the skill's endorsed pattern and keeps antfu the untouched base.
2. **Composition order `antfu(opts, ...ourConfigs, ...userConfigs)` is the override guarantee** — all our blocks (global, no `files` restriction) emit before user configs, so nothing is locked.
3. **Return `ReturnType<typeof antfu>`** for the composer type — avoids adding `eslint-flat-config-utils` as a runtime dependency (the `FlatConfigComposer` type is not re-exported by antfu).
4. **Type-aware always on** via `parserOptions.projectService: true`; remove the repo-pinned `tsconfigRootDir` (defaults to `process.cwd()`), which would otherwise break every installed consumer.
5. **Parity enforced by a `{ ruleName: severity }` snapshot** diffed against the current `eslint.config.mjs` output so no opinionated rule is silently dropped.

**Trade-offs Accepted**:
- Type-aware always on → consumers without a resolvable `tsconfig.json` get parser errors (documented README escape hatch).
- 12 small source files instead of one monolith → more files, but per-group testability and resistance to rule churn.
- `eslint-plugin-unicorn` pinned to `65.0.1` → keeps `eslint >= 9` peer support.

### Rule-Group Ownership Map (locked — resolves analysis Risk #5/#7/#10)

Each `configs/*.ts` builder is `(resolved: ResolvedAgentConfigOptions) => TypedFlatConfigItem[]`. Ownership is exclusive; document the mapping as a code comment in each file.

| Builder | Owns | Source in `eslint.config.mjs` |
|---|---|---|
| `type-aware.ts` | `tseslint.configs.strictTypeChecked.slice(1)` + `projectService:true` (no `tsconfigRootDir`) + `@typescript-eslint/use-unknown-in-catch-callback-variable`, `@typescript-eslint/only-throw-error` + wires `no-never-return/no-never-return-type` | 50-58, 66, 112-113 |
| `sonarjs.ts` | Every sonar rule EXCEPT the 3 naming rules and `cognitive-complexity` (control-flow, dead-code, nesting, loops, functions, promises, security, testing) | 163-225 |
| `unicorn.ts` | catch-error-name, prefer-optional-catch-binding, throw-new-error:off, consistent-destructuring, consistent-function-scoping, custom-error-definition, no-lonely-if, no-nested-ternary, no-static-only-class, prefer-class-fields | 94-107 |
| `jsdoc.ts` | require-jsdoc, require-description, require-param, require-returns, check-param-names, no-blank-blocks | 71-90 |
| `naming.ts` | `sonarjs/class-name\|function-name\|variable-name` + `validate-filename/naming-rules` + `test/prefer-lowercase-title:'off'` | 22-33, 130-155 |
| `complexity.ts` | core `complexity`/`max-depth`/`max-lines-per-function`/`max-statements`/`max-lines`/`max-nested-callbacks`/`max-params` + **owns** `sonarjs/cognitive-complexity` | 40-46, 162 |
| `stylistic.ts` | no-warning-comments, prefer-const, init-declarations, id-length, padding-line-between-statements, preserve-caught-error, no-restricted-syntax, `@typescript-eslint/consistent-type-definitions`, `class-methods-use-this:off` + `@typescript-eslint/class-methods-use-this`, `ts/consistent-type-imports:'off'` (documented decision), `perfectionist/sort-named-imports:'off'` | 34, 36, 114, 119-123, 230-281 |
| `promise.ts` | register `eslint-plugin-promise` + `promise/prefer-await-to-then:'error'` (antfu does NOT bundle it) | 5, 35 |
| `custom.ts` | wire `alias/prefer-alias` (option-gated on `alias !== false`) + `step-down-rule/step-down` (always) | 12-19, 37 |

### Architecture Decomposition

| Component | File Path | Responsibility | Reuses From |
|---|---|---|---|
| Factory + type re-exports | `src/index.ts` | Resolve options, strip `alias`, compose `antfu(antfuOpts, ...ourConfigs, ...userConfigs)`, return composer | REWRITE of `eslint.config.mjs` compose logic (deletes dummy `fn()`) |
| Type surface | `src/types.ts` | `AgentConfigOptions extends OptionsConfig`, `AliasOption`, `ResolvedAgentConfigOptions` | antfu `OptionsConfig` (verify post-install) |
| 9 rule-group builders | `src/configs/*.ts` | Emit `TypedFlatConfigItem[]` per ownership map above | Line ranges in ownership map |
| step-down plugin | `src/plugins/step-down.ts` | Typed port of scope-walking rule (behavior unchanged) | `eslint.plugin.step-down-rule.mjs` (246 lines) |
| root-alias plugin | `src/plugins/root-alias.ts` | Typed port + options schema `[{prefix,sourceDir}]`, keep `fixable:'code'` | `eslint.plugin.root-alias.mjs` (61 lines) |
| no-never-return plugin | `src/plugins/no-never-return-type.ts` | CJS→ESM typed port, repoint docs URL | `eslint.plugin.no-never-return-type.cjs` (already typed) |

```
consumer eslint.config.mjs
        │ config(options, ...userConfigs)
        ▼
   src/index.ts (factory) ── resolveOptions + strip alias
        ├──► configs/type-aware.ts ──► plugins/no-never-return-type.ts
        ├──► configs/sonarjs.ts    configs/unicorn.ts    configs/jsdoc.ts
        ├──► configs/naming.ts     configs/complexity.ts configs/stylistic.ts
        ├──► configs/promise.ts
        └──► configs/custom.ts ──► plugins/root-alias.ts + plugins/step-down.ts
        │ antfu(antfuOpts, ...ourItems, ...userConfigs)
        ▼
   FlatConfigComposer (antfu) ──► ESLint engine
```

### Building Block View

```
┌────────────────────────────────────────────────────────────┐
│                    agent-eslint-config                       │
├────────────────────────────────────────────────────────────┤
│  types.ts ──┐                                                │
│             ▼                                                │
│  ┌──────────────────── configs/ (9 builders) ────────────┐  │
│  │ type-aware  sonarjs  unicorn  jsdoc  naming            │  │
│  │ complexity  stylistic  promise  custom                 │  │
│  └───────────┬───────────────────────────────┬───────────┘  │
│              │ imports                        │ imports      │
│              ▼                                ▼              │
│  ┌───────── plugins/ (3 custom rules) ──────────────────┐   │
│  │ step-down   root-alias   no-never-return-type        │   │
│  └──────────────────────────────────────────────────────┘   │
│              ▲                                               │
│              │ composes                                     │
│         index.ts  ──►  antfu() base (untouched)             │
└────────────────────────────────────────────────────────────┘
```

### Expected Changes

```
src/
├── index.ts                     # REWRITE: config() factory + type re-exports
├── types.ts                     # NEW: AgentConfigOptions, AliasOption, ResolvedAgentConfigOptions
├── configs/                     # NEW: 9 builders (type-aware, sonarjs, unicorn, jsdoc,
│                                #      naming, complexity, stylistic, promise, custom)
├── plugins/                     # NEW: step-down.ts, root-alias.ts, no-never-return-type.ts
├── eslint.config.mjs                       # DELETE
├── eslint.plugin.step-down-rule.mjs        # DELETE
├── eslint.plugin.root-alias.mjs            # DELETE
└── eslint.plugin.no-never-return-type.cjs  # DELETE
tests/
├── plugins/{step-down,root-alias,no-never-return-type}.test.ts  # NEW
├── factory.test.ts             # NEW
├── rule-set.snapshot.test.ts   # NEW
├── fixtures/tsconfig.json      # NEW
└── index.test.ts               # DELETE (dummy)
demo/                           # NEW: E2E fixture project (file:.. dep)
├── package.json  eslint.config.mjs  tsconfig.json  fixtures/{good.ts,bad.ts}
package.json                    # UPDATE: runtime deps, eslint peer, devDeps, types field (.d.mts), test:e2e
README.md                       # UPDATE: install fix, usage, override model, alias, type-aware tradeoff, rule groups
tsconfig.json                   # UPDATE: widen include to cover tests
tsdown.config.ts                # VERIFY only
```

### Contracts

**Public API**:
```
config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem[]): ReturnType<typeof antfu>
```

**Types** (`src/types.ts`):
```
AliasOption = false | { prefix?: string; sourceDir?: string }   // default { prefix:'@', sourceDir:'src' }
interface AgentConfigOptions extends OptionsConfig { alias?: AliasOption }
```

**Builder contract** (all 9):
```
<name>Config(options: ResolvedAgentConfigOptions): TypedFlatConfigItem[]
```

**Plugin export shape** (all 3):
```
{ meta: { name: string; version: string }, rules: Record<string, RuleModule> }
```

**root-alias rule** options schema: `[{ prefix?: string; sourceDir?: string }]`, `fixable: 'code'`.

### Workflow Steps

```
1. resolveOptions(options)   ──► 2. strip `alias` key   ──► 3. ourConfigs.flatMap(fn => fn(resolved))
        │ default alias={@,src}        │ → antfuOptions          │ → TypedFlatConfigItem[] (global)
        ▼                              ▼                         ▼
4. antfu(antfuOptions, ...ourItems, ...userConfigs)  ──► 5. FlatConfigComposer  ──► ESLint resolved array
```

### Runtime Scenarios

**Scenario: Consumer lint run**
```
consumer ──► config() ──► resolveOptions ──► antfu(...) ──► composer ──► ESLint resolves array
                                                                              │
                                          type-aware rules ◄── TS type checker (per file)
                                                                              ▼
                                                                       lint reports
```

**Scenario: User override (ordering guarantee)**
```
config({}, { files:['**/*.spec.ts'], rules:{ 'max-lines-per-function':'off' } })
   ──► sentinel emitted AFTER all our blocks ──► last-match-wins ──► our default overridden for spec files
```

**State transitions**:
```
raw options ─resolve─► resolved ─strip alias─► antfuOptions ─compose─► composer ─ESLint─► resolved array
```

### Architecture Decisions

**ADR-1: Microkernel thin-factory over antfu**
- **Status**: Accepted
- **Context**: Need drop-in antfu compatibility, full rule parity, and per-group testability.
- **Options**: (1) modular builders + thin factory; (2) single monolithic config module; (3) reimplement antfu presets.
- **Decision**: Modular builders composed by a thin factory that returns antfu's composer.
- **Consequences**: full override power via native `{ files, rules }` items; requires discipline to order all our blocks before `...userConfigs`; more (but smaller, testable) files.

**ADR-2: Return `ReturnType<typeof antfu>` instead of importing `FlatConfigComposer`**
- **Status**: Accepted
- **Context**: `FlatConfigComposer` is not re-exported by `@antfu/eslint-config` (lives in `eslint-flat-config-utils`).
- **Options**: import from `eslint-flat-config-utils` (extra runtime dep) vs `ReturnType<typeof antfu>`.
- **Decision**: `ReturnType<typeof antfu>`.
- **Consequences**: no extra runtime dependency; return type tracks antfu automatically.

**ADR-3: Type-aware always on, `tsconfigRootDir` removed**
- **Status**: Accepted
- **Context**: The copied config pinned `tsconfigRootDir: import.meta.dirname` to this repo, which resolves inside the package's own `node_modules` once installed → breaks type-aware linting for every consumer.
- **Options**: keep type-aware opt-in vs always-on with `projectService`.
- **Decision**: Always on, `parserOptions.projectService: true`, no `tsconfigRootDir` (defaults to `process.cwd()`).
- **Consequences**: consumers need a resolvable `tsconfig.json`; README documents the escape hatch.

### Build Sequence

**Phase 1 — Dependencies & packaging foundation**
- [X] Re-verify versions with `npm view <pkg> time --json` (`.npmrc min-release-age=7`), install 8 runtime deps + devDeps (`@typescript-eslint/rule-tester`, `eslint`, `concurrently`). *Reuse: skill Installation list (re-verify ages).*
- [X] Set `peerDependencies.eslint`; pin `eslint-plugin-unicorn@65.0.1` for eslint>=9. *Reuse: skill pitfall table.*
- [X] Read `node_modules/@antfu/eslint-config/dist/*.d.mts` to confirm `OptionsConfig`/`TypedFlatConfigItem` (analysis Risk #2). *Reuse: None — verification.*

**Phase 2 — Types + plugin ports** (depends on Phase 1)
- [X] `src/types.ts`: `AliasOption`, `AgentConfigOptions extends OptionsConfig`, `ResolvedAgentConfigOptions`. *Reuse: antfu `OptionsConfig`.*
- [X] `src/plugins/no-never-return-type.ts`: port .cjs, CJS→ESM, repoint docs URL to `agent-eslint-config`. *Reuse: `eslint.plugin.no-never-return-type.cjs`.*
- [X] `src/plugins/root-alias.ts`: port + options schema `[{prefix,sourceDir}]`, replace hardcoded `@`/`src`, keep autofix. *Reuse: `eslint.plugin.root-alias.mjs` + RuleCreator pattern from the .cjs.*
- [X] `src/plugins/step-down.ts`: faithful typed port, helper boundaries unchanged (analysis Risk #4). *Reuse: `eslint.plugin.step-down-rule.mjs`.*

**Phase 3 — Rule-group builders** (depends on Phase 2)
- [X] Author the 9 `configs/*.ts` per the locked ownership map; document ownership as a code comment in each. *Reuse: line ranges in ownership map from `eslint.config.mjs`.*

**Phase 4 — Factory + cleanup** (depends on Phases 2, 3)
- [X] `src/index.ts`: `config(options?, ...userConfigs)`, `resolveOptions`, strip `alias`, compose, return `ReturnType<typeof antfu>`; re-export types. *Reuse: compose pattern from `eslint.config.mjs` + skill thin-factory snippet.*
- [X] Delete 4 legacy `src/eslint.*` files + `tests/index.test.ts`; remove hardcoded `ignores`. *Reuse: None.*

**Phase 5 — Tests** (depends on Phases 2, 3, 4)
- [X] `tests/fixtures/tsconfig.json` + RuleTester↔vitest shim. *Reuse: skill RuleTester snippet.*
- [X] `tests/plugins/*.test.ts` (3): valid/invalid, root-alias autofix + prefix/sourceDir variants, no-never-return type-aware. *Reuse: current `.mjs`/`.cjs` as behavioral spec.*
- [X] `tests/factory.test.ts`: composer resolution, override ordering by object identity, antfu passthrough (no hardcoded rule names), `alias:false` vs default. *Reuse: skill Example 2.*
- [X] `tests/rule-set.snapshot.test.ts`: diff `{ruleName:severity}` against current `eslint.config.mjs` output (parity, analysis Risk #10). *Reuse: `eslint.config.mjs` as baseline.*
- [X] Widen `tsconfig.json` `include` to cover `tests`. *Reuse: None.*

**Phase 6 — Build + demo E2E + README** (depends on Phases 4, 5)
- [X] `npm run build`; inspect `dist/` filenames; fix `package.json` `types`/`exports` to actual `.d.mts` (analysis Risk #1). *Reuse: tsdown config (verify).*
- [X] `demo/` files + `test:e2e` (build root → `npm install --prefix demo` → eslint, assert JSON rule-IDs). *Reuse: None.*
- [X] README rewrite (install-name fix, usage, native override model + ordering, `alias`, type-aware tradeoff + escape hatch, rule groups, keep jscpd/knip). *Reuse: existing README jscpd/knip section.*

---

## Implementation Process

You MUST launch for each step a separate agent, instead of performing all steps yourself. And for each step marked as parallel, you MUST launch separate agents in parallel.

**CRITICAL:** For each agent you MUST:
1. Use the **Agent** type specified in the step (e.g., `sdd:developer`, `sdd:tech-writer`) with the specified **Model**
2. Provide the path to this task file and a prompt naming exactly which step to implement
3. Require the agent to implement exactly that step, not more, not less, not other steps
4. Instruct the agent to read and analyse the `eslint-config-authoring` skill (`.claude/skills/eslint-config-authoring/SKILL.md`) before making any code changes, per the task banner

### Parallelization Overview

```
Step 1  Deps + antfu type confirmation  [sdd:developer / opus]
    │  (Level 0 foundation)
    ▼
Step 2  Type surface + test infra       [sdd:developer / opus]
    │
    ├───────────────┬───────────────┬───────────────┐
    ▼               ▼               ▼               ▼
Step 3           Step 4          Step 5          Step 6
no-never-return  root-alias      step-down       7 plugin-indep
[developer/opus] [developer/opus][developer/opus] builders
                                 (HIGH RISK)     [developer/sonnet]
    (PARALLEL GROUP A — width 4 — MUST run in parallel)
    │               │               │               │
    └───────┬───────┴───────────────┘               │
            ▼                                        │
        Step 7  type-aware + custom builders         │
        [sdd:developer / opus]  (needs 3,4,5)        │
            │                                        │
            └────────────────┬───────────────────────┘
                             ▼
                         Step 8  Factory index.ts
                         [sdd:developer / opus]  (needs 6,7)
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
        Step 9           Step 10          Step 12
        factory+snapshot build+packaging  README rewrite
        tests + cleanup  fix              [sdd:tech-writer/opus]
        [developer/opus] [developer/opus]
            (PARALLEL GROUP B — width 3 — MUST run in parallel)
                             │
                             ▼
                         Step 11  Demo E2E + test:e2e
                         [sdd:developer / opus]  (needs 10)
```

**Max parallel width: 4** (Group A: Steps 3, 4, 5, 6). Group B (Steps 9, 10, 12) runs at width 3; Step 11 follows Step 10.

### Implementation Strategy

**Approach**: Mixed, primarily **Bottom-Up**.

**Rationale**: The thin factory (`config()`) is trivially simple; all real risk lives in the leaves — the three behavior-fidelity custom-rule ports and the parity-critical rule-group transcription. Build and verify those low-level building blocks first, then the factory that composes them, then integration (build → demo E2E → README). A top-down approach would defer the hardest, highest-uncertainty work (step-down scope-walker port, rule parity) behind a trivial orchestration shell. This mirrors the architecture's Build Sequence (Phases 1–6).

### Phase Overview

```

Phase 1: Setup            (Step 1)
    │  deps + antfu type confirmation
    ▼
Phase 2: Foundation       (Step 2)
    │  types.ts + test infrastructure
    ▼
Phase 3: Custom Plugin Ports   (Steps 3, 4, 5 — parallel)
    │  no-never-return / root-alias / step-down (+ RuleTester tests)
    ▼  (Step 6 runs parallel with 3–5)
Phase 4: Rule-Group Builders   (Step 6 ∥, then Step 7)
    │  7 plugin-independent builders; then type-aware + custom
    ▼
Phase 5: Factory          (Step 8)
    │  index.ts compose + type re-exports
    ▼
Phase 6: Verification & Integration  (Steps 9, 10, 11, 12)
       factory+snapshot tests+cleanup │ build+packaging │ demo E2E │ README
```

---

### Step 1: Dependencies, Packaging Deps & antfu Type Confirmation [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** None
**Parallel with:** None

**Goal**: Install and version-resolve every runtime/dev dependency the rewrite imports, set the ESLint peer range, and confirm antfu's real exported type surface so `types.ts` is written against verified types (not memory).

**Complexity**: Medium
**Uncertainty**: Medium (antfu `OptionsConfig`/`TypedFlatConfigItem` unverified at analysis time — analysis Risk #2; version resolution gated by `min-release-age=7`)
**Dependencies**: None (Level 0)
**Integration Points**: `package.json` (deps/peer/devDeps), `node_modules/@antfu/eslint-config`, `.npmrc`

#### Expected Output

- `package.json`: runtime `dependencies` (`@antfu/eslint-config`, `typescript-eslint`, `@typescript-eslint/utils`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn` pinned `65.0.1`, `eslint-plugin-jsdoc`, `eslint-plugin-validate-filename`, `eslint-plugin-promise`), `peerDependencies.eslint` (`^9.10.0 || ^10.0.0`), devDeps (`@typescript-eslint/rule-tester`, `eslint`, `concurrently`)
- Populated `node_modules/` with installed packages
- A short recorded note (in scratchpad or PR notes) of the confirmed `OptionsConfig` / `TypedFlatConfigItem` shape and the `FlatConfigComposer` source

#### Success Criteria

- [X] `npm install` completes without `min-release-age` rejection (versions re-verified via `npm view <pkg> time --json`)
- [X] All 8 runtime deps present under `dependencies`; `eslint-plugin-unicorn` is `65.0.1`; `eslint` present only as `peerDependencies` + `devDependencies`
- [X] `@typescript-eslint/rule-tester`, `eslint`, `concurrently` present under `devDependencies`
- [X] `node_modules/@antfu/eslint-config/dist/*.d.mts` read and `OptionsConfig`, `TypedFlatConfigItem` export shapes confirmed to match the architecture's Contracts section
- [X] `typescript-eslint`, `@typescript-eslint/utils`, `@typescript-eslint/rule-tester` are on the same version (monorepo lockstep)

#### Subtasks

- [X] Re-verify candidate versions with `npm view <pkg> time --json` against `.npmrc` `min-release-age=7`
- [X] Add the 8 runtime `dependencies` to `package.json` (prefer semver ranges; pin `eslint-plugin-unicorn@65.0.1`)
- [X] Add `peerDependencies.eslint` = `^9.10.0 || ^10.0.0`
- [X] Add devDeps `@typescript-eslint/rule-tester`, `eslint`, `concurrently`
- [X] Run `npm install`
- [X] Read `node_modules/@antfu/eslint-config/dist/*.d.mts`; record confirmed `OptionsConfig`/`TypedFlatConfigItem`/`FlatConfigComposer` facts (recorded at `.specs/scratchpad/step1-antfu-types.md`)

#### Blockers

- Network access to npm registry required
- A newer-than-7-days version of any dep would fail install (must fall back to an age-eligible version)

#### Risks

- **antfu type shape differs from architecture prose** → confirm by reading `.d.mts` before writing `types.ts`; adjust `types.ts` accordingly (analysis Risk #2)
- **unicorn latest silently requires eslint ≥10.4** → pin `65.0.1` to keep eslint-9 support (skill pitfall table)
- **min-release-age blocks a version** → re-resolve at install time, prefer ranges over pins (analysis Risk #8)

#### Definition of Done

- [X] All success criteria met
- [X] `npm install` reproducible from committed `package.json`
- [X] antfu type facts recorded for Step 2

#### Verification

**Level:** ✅ Single Judge
**Artifact:** `package.json` (+ recorded antfu type-surface note)
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S1-1 | Are all 8 runtime deps (`@antfu/eslint-config`, `typescript-eslint`, `@typescript-eslint/utils`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-validate-filename`, `eslint-plugin-promise`) present under `dependencies`? | hard_rule | essential |
| S1-2 | Is `eslint-plugin-unicorn` pinned exactly to `65.0.1`? | hard_rule | essential |
| S1-3 | Is `eslint` present ONLY under `peerDependencies` + `devDependencies` and NOT under `dependencies`? | hard_rule | essential |
| S1-4 | Are `@typescript-eslint/rule-tester`, `eslint`, and `concurrently` present under `devDependencies`? | hard_rule | essential |
| S1-5 | Are `typescript-eslint`, `@typescript-eslint/utils`, and `@typescript-eslint/rule-tester` all on the same version (monorepo lockstep)? | hard_rule | important |
| S1-6 | Were versions re-verified against `.npmrc` `min-release-age=7` (e.g. via `npm view <pkg> time --json`) so `npm install` completes without a release-age rejection? | hard_rule | essential |
| S1-7 | Is the confirmed shape of antfu's `OptionsConfig` / `TypedFlatConfigItem` and the `FlatConfigComposer` source recorded (scratchpad/PR note) for Step 2? | hard_rule | important |
| S1-8 | Is `eslint` accidentally listed under `dependencies` (must be NO)? | principle | pitfall |
| S1-9 | Are all dependency versions hard-pinned in a way that defeats `min-release-age` auto-selection where ranges were expected (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Install reproducible: `npm install` (completes without `min-release-age` rejection)

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Dependency Correctness & Completeness | 0.34 |
| Version / Release-Age Discipline | 0.18 |
| antfu Type-Surface Evidence | 0.18 |
| Packaging Hygiene (peer vs dep separation) | 0.15 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Dependency Correctness & Completeness

Whether every required runtime/dev dependency is present, in the correct `package.json` section, at a version matching the architecture (unicorn `65.0.1`, tseslint trio lockstep).

Enumerate the 8 runtime deps, the 3 devDeps, and the peer; check each against Step 1's Expected Output.

Score Definitions
- 1: One or more of the 8 runtime deps missing, or unicorn not `65.0.1`.
- 2: All runtime deps present but a devDep missing OR tseslint trio versions diverge (DEFAULT — must justify higher).
- 3: All runtime deps, devDeps, and peer present at correct versions; unicorn `65.0.1`; tseslint trio lockstep.
- 4: All of 3 AND versions explicitly cross-checked against `min-release-age` with evidence recorded (IDEAL).
- 5: All of 4 AND a documented rationale for each version choice tying back to the SKILL install list (OVERLY PERFECT).

##### Version / Release-Age Discipline

Whether versions honor `.npmrc` `min-release-age=7` and prefer semver ranges over pins except where a pin is required (unicorn).

Check for evidence of `npm view <pkg> time` verification and range-vs-pin choices.

Score Definitions
- 1: `npm install` would fail min-release-age, or a too-new version is pinned.
- 2: Install succeeds but no evidence ages were re-verified (DEFAULT — must justify higher).
- 3: Ages re-verified; ranges used except the required unicorn pin.
- 4: All of 3 with recorded `npm view time` evidence per resolved dep (IDEAL).
- 5: All of 4 plus a reproducibility note ensuring future installs stay age-eligible (OVERLY PERFECT).

##### antfu Type-Surface Evidence

Whether the real `OptionsConfig` / `TypedFlatConfigItem` shapes and `FlatConfigComposer` source were read from `node_modules` and recorded, so Step 2 is written against verified types.

Score Definitions
- 1: No type facts recorded; types written from memory.
- 2: A vague note without concrete field/source evidence (DEFAULT — must justify higher).
- 3: Concrete confirmation of both types and the `FlatConfigComposer` source location.
- 4: All of 3 with exact `.d.mts` file paths and relevant excerpts cited (IDEAL).
- 5: All of 4 plus notes on any divergence from the architecture prose and its impact on `types.ts` (OVERLY PERFECT).

##### Packaging Hygiene (peer vs dep separation)

Whether `eslint` is correctly kept out of `dependencies` (peer + dev only) and runtime plugin deps are declared as `dependencies` (antfu pattern).

Score Definitions
- 1: `eslint` present under `dependencies`, or plugins wrongly placed as peers.
- 2: Correct sections but peer range imprecise or inconsistent with unicorn pin (DEFAULT — must justify higher).
- 3: `eslint` peer+dev only; peer range `^9.10.0 || ^10.0.0` consistent with the unicorn `65.0.1` pin.
- 4: All of 3 with the peer range justified against the unicorn eslint-9 support note (IDEAL).
- 5: All of 4 plus a documented compatibility matrix (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the change follows the binding `eslint-config-authoring` SKILL (install list, unicorn pin, min-release-age live-constraint, peer-vs-dep pattern) and repo conventions (CONTRIBUTING install/build).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md` (task banner mandates it). Check each applicable SKILL rule/pitfall.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. unicorn unpinned, eslint in deps, ignored min-release-age).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; install matches the SKILL's Installation guidance.
- 4: All SKILL rules honored with explicit citation to the SKILL section/pitfall checked (IDEAL).
- 5: Exceeds — proactively applies a SKILL recommendation the repo had not yet adopted (OVERLY PERFECT).

---

### Step 2: Type Surface + Test Infrastructure (Foundation) [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 1
**Parallel with:** None

**Goal**: Establish the shared type surface (`src/types.ts`) all builders and the factory depend on, plus the vitest↔RuleTester harness and TS fixture that all custom-rule tests depend on.

**Complexity**: Small–Medium
**Uncertainty**: Low (depends on Step 1's confirmed types)
**Dependencies**: Step 1
**Integration Points**: consumed by Steps 3–8 (types) and Steps 3–5 (test harness); `tsconfig.json` include

#### Expected Output

- `src/types.ts`: `AliasOption`, `AgentConfigOptions extends OptionsConfig`, `ResolvedAgentConfigOptions`
- `tests/fixtures/tsconfig.json`: resolvable tsconfig for type-aware RuleTester
- RuleTester↔vitest shim (`tests/setup.ts` or shared helper) wiring `RuleTester.{it,itOnly,describe,afterAll} = vitest.*`
- `tsconfig.json`: `include` widened to cover `tests`

#### Success Criteria

- [X] `src/types.ts` compiles under `tsc --noEmit`; `AgentConfigOptions` structurally extends antfu's confirmed `OptionsConfig` and adds `alias?: AliasOption`
- [X] `AliasOption` = `false | { prefix?: string; sourceDir?: string }`; `ResolvedAgentConfigOptions` reflects defaults `{ prefix: '@', sourceDir: 'src' }`
- [X] A trivial sanity RuleTester run using the shim executes under `vitest --run` without "Cannot find `describe`"
- [X] `tests/fixtures/tsconfig.json` type-checks a sample fixture file
- [X] `tsconfig.json` `include` now covers `tests` (verified by `tsc --noEmit` seeing test files)

#### Subtasks

- [X] Write `src/types.ts` using Step 1's confirmed antfu types
- [X] Add `tests/fixtures/tsconfig.json`
- [X] Add RuleTester↔vitest shim (`tests/setup.ts` or helper) per skill snippet
- [X] Widen `tsconfig.json` `include` to `["src", "tests"]`
- [X] Add a minimal sanity test proving the shim works

#### Blockers

- Requires Step 1's installed `@typescript-eslint/rule-tester` and confirmed antfu types

#### Risks

- **`exactOptionalPropertyTypes: true` friction with optional antfu fields** → model optionals precisely in `types.ts`; adjust if compile fails

#### Definition of Done

- [X] All success criteria met
- [X] `tsc --noEmit` and `vitest --run` pass (sanity test green)

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/types.ts`, `tests/fixtures/tsconfig.json`, RuleTester↔vitest shim (`tests/setup.ts` or helper), `tsconfig.json`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S2-1 | Does `AgentConfigOptions` structurally EXTEND antfu's `OptionsConfig` (rather than redefine it) and add `alias?: AliasOption`? | hard_rule | essential |
| S2-2 | Is `AliasOption` exactly `false \| { prefix?: string; sourceDir?: string }`? | hard_rule | essential |
| S2-3 | Does `ResolvedAgentConfigOptions` encode the defaults `{ prefix: '@', sourceDir: 'src' }` (alias resolved, non-optional)? | hard_rule | essential |
| S2-4 | Does the shim assign `RuleTester.{it, itOnly, describe, afterAll} = vitest.*` so RuleTester runs under vitest? | hard_rule | essential |
| S2-5 | Does a sanity RuleTester run execute under `vitest --run` without a "Cannot find `describe`" error? | hard_rule | essential |
| S2-6 | Does `tests/fixtures/tsconfig.json` type-check a sample fixture file (usable for type-aware RuleTester)? | hard_rule | important |
| S2-7 | Is `tsconfig.json` `include` widened so `tsc --noEmit` sees the `tests` directory? | hard_rule | important |
| S2-8 | Does `src/types.ts` compile under `tsc --noEmit` with the repo's `strict` + `exactOptionalPropertyTypes: true`? | hard_rule | essential |
| S2-9 | Is `OptionsConfig` redefined/hand-rolled instead of imported from `@antfu/eslint-config` (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Tests pass: `npm run test`
- [X] No code duplication: types are not re-declarations of antfu types
- [X] Reuse honored: `AgentConfigOptions extends OptionsConfig` per architecture "Reuses From"
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Type Contract Fidelity | 0.34 |
| Type-Safety / Compilation | 0.20 |
| Test-Harness Correctness | 0.18 |
| Reusability / Placement | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Type Contract Fidelity

Whether the exported types faithfully express the drop-in contract: extend `OptionsConfig`, `AliasOption` shape, resolved defaults.

Score Definitions
- 1: `AgentConfigOptions` does not extend `OptionsConfig`, or `AliasOption` shape is wrong.
- 2: Extends `OptionsConfig` but `alias`/resolved defaults imprecise (DEFAULT — must justify higher).
- 3: Extends `OptionsConfig`, exact `AliasOption`, and `ResolvedAgentConfigOptions` with `{ '@', 'src' }` defaults.
- 4: All of 3 with types documented and verified against Step 1's recorded antfu shapes (IDEAL).
- 5: All of 4 plus tsd/type-level assertions guaranteeing structural compatibility with `OptionsConfig` (OVERLY PERFECT).

##### Type-Safety / Compilation

Whether the file compiles cleanly under the repo's strict TS (including `exactOptionalPropertyTypes`).

Score Definitions
- 1: `tsc --noEmit` fails.
- 2: Compiles but uses `any`/loose optionals to sidestep `exactOptionalPropertyTypes` (DEFAULT — must justify higher).
- 3: Compiles cleanly with optionals modeled precisely.
- 4: All of 3 with no `@ts-expect-error`/casts and clean handling of optional antfu fields (IDEAL).
- 5: All of 4 plus proactive narrowing that improves consumer inference (OVERLY PERFECT).

##### Test-Harness Correctness

Whether the vitest↔RuleTester shim, fixture tsconfig, and tsconfig include collectively enable type-aware rule testing.

Score Definitions
- 1: Shim missing/incorrect; RuleTester cannot run under vitest.
- 2: Shim present but fixture tsconfig or include missing/broken (DEFAULT — must justify higher).
- 3: Shim, fixture tsconfig, and widened include all present and working (sanity test green).
- 4: All of 3 with the shim placed as a reusable shared setup consumed by rule tests (IDEAL).
- 5: All of 4 plus a documented pattern others can follow for new type-aware rules (OVERLY PERFECT).

##### Reusability / Placement

Whether shim/fixture are placed where Steps 3–5 can reuse them without duplication.

Score Definitions
- 1: Harness inlined per-test in a way that forces duplication.
- 2: Shared but awkwardly placed/named (DEFAULT — must justify higher).
- 3: Cleanly shared (e.g. `tests/setup.ts`) and importable by all rule tests.
- 4: All of 3 with minimal fixture and clear naming (IDEAL).
- 5: All of 4 plus a documented convention for fixtures (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the types/harness follow the binding `eslint-config-authoring` SKILL (extend `OptionsConfig`, vitest↔RuleTester shim pattern, type-aware fixture).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. redefines `OptionsConfig`, no shim).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the SKILL's type/harness patterns.
- 4: All SKILL rules honored with explicit citation to the pattern applied (IDEAL).
- 5: Exceeds — applies a SKILL recommendation beyond the minimum (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `tests/setup.ts` shim + `tests/fixtures/tsconfig.json` (harness sanity)
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| unit | small | vitest + @typescript-eslint/rule-tester | fixtures/tsconfig.json (projectService) | Gate 1 |

**Test Cases to Cover**

##### AC: Test harness is usable
- [unit] a trivial RuleTester run executes under `vitest --run` without "Cannot find `describe`" (shim sanity) [main]
- [unit] `tests/fixtures/tsconfig.json` type-checks a sample fixture file (fixture usable for type-aware tests) [main]

---

### Step 3: Port `no-never-return-type` Plugin + Tests [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Steps 4, 5, 6 (MUST be launched in parallel — same dependency: Step 2)

**Goal**: Port `src/eslint.plugin.no-never-return-type.cjs` (CJS→ESM, typed) to `src/plugins/no-never-return-type.ts` with identical behavior, and cover it with a type-aware RuleTester suite.

**Complexity**: Medium
**Uncertainty**: Low–Medium (type-aware rule needs parser services against the fixture tsconfig)
**Dependencies**: Step 2
**Integration Points**: wired later by `configs/type-aware.ts` (Step 7); test uses `tests/fixtures/tsconfig.json`

#### Expected Output

- `src/plugins/no-never-return-type.ts`: `{ meta, rules }` export using `ESLintUtils.RuleCreator`, docs URL repointed to `agent-eslint-config`
- `tests/plugins/no-never-return-type.test.ts`: valid/invalid via RuleTester, `parserOptions` pointed at `tests/fixtures/tsconfig.json`

#### Success Criteria

- [X] Rule detects `never`-returning functions and exempts callbacks exactly as the `.cjs` did
- [X] Uses `ESLintUtils.getParserServices(context)`; RuleCreator docs URL contains `agent-eslint-config` (not `decision-engine`)
- [X] Invalid fixtures report the expected `messageId`; valid fixtures produce zero reports
- [X] `vitest --run tests/plugins/no-never-return-type.test.ts` passes

#### Subtasks

- [X] Port `.cjs` → `.ts`, converting `require` to ES imports and adding types
- [X] Repoint RuleCreator docs URL
- [X] Write RuleTester valid/invalid suite pointed at the fixture tsconfig
- [X] Confirm behavior parity against the original `.cjs`

#### Blockers

- Requires Step 2's fixture tsconfig + shim

#### Risks

- **type-aware test misconfigured → parser error masks logic** → verify parser services resolve against the fixture before asserting rule logic

#### Definition of Done

- [X] All success criteria met; tests written and passing

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/plugins/no-never-return-type.ts`, `tests/plugins/no-never-return-type.test.ts`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S3-1 | Does the rule use `ESLintUtils.RuleCreator` and `ESLintUtils.getParserServices(context)` for type-aware checking? | hard_rule | essential |
| S3-2 | Does the RuleCreator docs URL contain `agent-eslint-config` and NOT `decision-engine`? | hard_rule | essential |
| S3-3 | Does it detect `never` return types via `checker.getReturnTypeOfSignature` + `ts.TypeFlags.Never`, reporting `messageId: 'noNeverReturn'`? | hard_rule | essential |
| S3-4 | Is the callback exemption preserved (object `Property` value AND `CallExpression` argument are NOT reported)? | hard_rule | essential |
| S3-5 | Are class methods checked via the inner function and reported on the `MethodDefinition`, while `FunctionExpression` skips a `MethodDefinition` parent? | hard_rule | important |
| S3-6 | Do invalid fixtures report `noNeverReturn` and valid fixtures produce zero reports under RuleTester? | hard_rule | essential |
| S3-7 | Is the file ES-module TypeScript (no leftover `require`/`module.exports` from the `.cjs`)? | principle | pitfall |
| S3-8 | Are `context`/`node` left as `any` instead of typed via RuleCreator/utils (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Tests pass: `npm run test`
- [X] No code duplication: shim/fixture from Step 2 reused, not re-created
- [X] Reuse honored: uses `@typescript-eslint/utils` `ESLintUtils.RuleCreator` per architecture
- [X] Every `test_matrix` row (main + edge + valid) has a corresponding test
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Behavior Parity vs `.cjs` | 0.34 |
| Type-Aware Correctness | 0.20 |
| Typed-Port Quality | 0.18 |
| Test Coverage of Exemptions | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Behavior Parity vs `.cjs`

Whether the ported rule reports/exempts exactly what the original `.cjs` did across all node kinds.

Score Definitions
- 1: A reporting or exemption behavior differs from the original.
- 2: Happy path matches but at least one exemption/node-kind diverges (DEFAULT — must justify higher).
- 3: All node kinds (FunctionDeclaration, Arrow, FunctionExpression, MethodDefinition) and exemptions behave identically.
- 4: All of 3 proven by RuleTester cases mirroring each original branch (IDEAL).
- 5: All of 4 plus cases the original lacked that confirm no regression (OVERLY PERFECT).

##### Type-Aware Correctness

Whether parser services resolve and `never` detection uses the type checker correctly.

Score Definitions
- 1: Parser services not used, or `never` detection incorrect.
- 2: Uses services but test may mask logic behind a parser error (DEFAULT — must justify higher).
- 3: `getParserServices` + `getReturnTypeOfSignature` + `TypeFlags.Never`; tests confirm services resolve against the fixture.
- 4: All of 3 with an explicit test that parser services resolve before asserting rule logic (IDEAL).
- 5: All of 4 plus coverage of overloaded/generic signatures (OVERLY PERFECT).

##### Typed-Port Quality

Whether the port is idiomatic typed ESM (RuleCreator, no `any`, ESM imports, repointed docs URL).

Score Definitions
- 1: Leftover CJS, or pervasive `any`.
- 2: ESM but with `any` on context/node or stale docs URL (DEFAULT — must justify higher).
- 3: Fully typed via RuleCreator, ESM imports, docs URL repointed to `agent-eslint-config`.
- 4: All of 3 with typed message ids and schema (IDEAL).
- 5: All of 4 plus exported rule types reusable by the config builder (OVERLY PERFECT).

##### Test Coverage of Exemptions

Whether tests enumerate each exemption/branch, not just the happy path.

Score Definitions
- 1: Only a single happy-path case.
- 2: Main + one exemption (DEFAULT — must justify higher).
- 3: Main + both callback exemptions + class-method + standalone + valid case.
- 4: All of 3 plus a valid callback that throws to confirm it is not flagged (IDEAL).
- 5: All of 4 plus negative type-checker edge cases (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the rule follows the binding SKILL (typed RuleCreator pattern, type-aware RuleTester fixture usage).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. no RuleCreator, stale docs URL).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the custom-rule + RuleTester patterns.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `src/plugins/no-never-return-type.ts`
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| unit | small | @typescript-eslint/rule-tester + vitest | tests/fixtures/tsconfig.json (projectService) | Gate 1 |

**Test Cases to Cover**

##### AC: Custom rule ported and functioning (`no-never-return-type`)
- [unit] a `never`-returning function declaration reports `noNeverReturn` [main]
- [unit] a never-returning arrow used as an object `Property` value is NOT reported (callback exemption) [edge]
- [unit] a never-returning arrow passed as a `CallExpression` argument is NOT reported (callback exemption) [edge]
- [unit] a class method returning `never` is reported on the `MethodDefinition` [edge]
- [unit] a standalone never-returning `FunctionExpression` is reported [edge]
- [unit] a normal-return function produces zero reports [valid/error path]

---

### Step 4: Port `root-alias` Plugin (+ Options Schema) + Tests [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Steps 3, 5, 6 (MUST be launched in parallel — same dependency: Step 2)

**Goal**: Port `src/eslint.plugin.root-alias.mjs` to typed `src/plugins/root-alias.ts`, replacing the hardcoded `'@'`/`'src'` constants with an options schema `[{ prefix?, sourceDir? }]`, preserving `fixable: 'code'` autofix, and cover it with RuleTester including autofix + option variants.

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 2
**Integration Points**: wired later (option-gated) by `configs/custom.ts` (Step 7); consumes the `alias` option

#### Expected Output

- `src/plugins/root-alias.ts`: typed `{ meta, rules }`, rule `alias/prefer-alias`, options schema `[{ prefix?: string; sourceDir?: string }]`, `fixable: 'code'`
- `tests/plugins/root-alias.test.ts`: default + custom prefix/sourceDir, autofix output assertions, same-dir/non-src imports must not report

#### Success Criteria

- [X] Rule reports relative imports that should use the alias and autofixes to the aliased form
- [X] `prefix`/`sourceDir` read from rule options (defaults `{ prefix: '@', sourceDir: 'src' }`); custom values change reports and autofix output
- [X] Same-directory and non-`src` imports produce no report
- [X] Autofix output in RuleTester matches expected aliased import string
- [X] `vitest --run tests/plugins/root-alias.test.ts` passes

#### Subtasks

- [X] Port `.mjs` → `.ts` with `ESLintUtils.RuleCreator` and types
- [X] Add options schema `[{ prefix, sourceDir }]`; replace hardcoded constants with option reads (defaults applied)
- [X] Keep `fixable: 'code'`; consider `context.filename`/`context.cwd` over deprecated getters
- [X] Write RuleTester suite: default, custom `{prefix,sourceDir}`, autofix output, negative cases

#### Blockers

- Requires Step 2

#### Risks

- **Autofix string drift under new schema** → assert exact fixed output in tests, not just report count

#### Definition of Done

- [X] All success criteria met; tests written and passing

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/plugins/root-alias.ts`, `tests/plugins/root-alias.test.ts`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S4-1 | Does the plugin export typed `{ meta, rules }` with rule id `prefer-alias`, an options schema `[{ prefix?: string; sourceDir?: string }]`, and `fixable: 'code'`? | hard_rule | essential |
| S4-2 | Are defaults `{ prefix: '@', sourceDir: 'src' }` applied when the option is absent? | hard_rule | essential |
| S4-3 | Does a relative import resolving under `sourceDir` get reported AND autofixed to `'<prefix>/<...>'`? | hard_rule | essential |
| S4-4 | Do same-directory imports (`./x`, ≤2 path parts) and non-`sourceDir` imports produce NO report? | hard_rule | essential |
| S4-5 | Do custom `{ prefix, sourceDir }` values change both the reported alias and the autofix output string? | hard_rule | essential |
| S4-6 | Does the RuleTester assert the EXACT fixed output string (not just report count)? | hard_rule | important |
| S4-7 | Are the hardcoded `'@'`/`'src'` constants replaced by option reads (must NOT remain hardcoded)? | principle | pitfall |
| S4-8 | Is autofix asserted only by report count without verifying the fixed text (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Tests pass: `npm run test`
- [X] No code duplication: reuses Step 2 harness
- [X] Reuse honored: `ESLintUtils.RuleCreator` per architecture
- [X] Every `test_matrix` row (main + edge + negative) has a corresponding test
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Autofix & Report Fidelity | 0.30 |
| Options-Schema Correctness | 0.24 |
| Behavior Parity (negatives) | 0.18 |
| Test Rigor | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Autofix & Report Fidelity

Whether reports and the autofix output match the original behavior with the new option-driven prefix/sourceDir.

Score Definitions
- 1: Autofix produces wrong text or no fix.
- 2: Reports correctly but autofix text drifts in some case (DEFAULT — must justify higher).
- 3: Report and autofix output correct for default and custom options.
- 4: All of 3 with exact fixed-string assertions per case (IDEAL).
- 5: All of 4 plus multi-segment / nested-path fix coverage (OVERLY PERFECT).

##### Options-Schema Correctness

Whether the `[{ prefix?, sourceDir? }]` schema is declared and read with defaults applied.

Score Definitions
- 1: No schema, or `'@'`/`'src'` still hardcoded.
- 2: Schema present but defaults not applied when option omitted (DEFAULT — must justify higher).
- 3: Schema declared; defaults `{ '@', 'src' }` applied; custom values read.
- 4: All of 3 with schema validation covered by tests (IDEAL).
- 5: All of 4 plus schema-level type inference for options (OVERLY PERFECT).

##### Behavior Parity (negatives)

Whether same-directory and non-`sourceDir` imports are correctly left unreported.

Score Definitions
- 1: False positives on same-dir or non-src imports.
- 2: One negative category handled, the other not (DEFAULT — must justify higher).
- 3: Both same-dir (`./x`, ≤2 parts) and non-src imports produce no report.
- 4: All of 3 with explicit negative test cases (IDEAL).
- 5: All of 4 plus boundary cases around the ≤2-parts rule (OVERLY PERFECT).

##### Test Rigor

Whether tests assert exact fix output and cover custom-option variants + negatives.

Score Definitions
- 1: Only a single report-count assertion.
- 2: Default case with exact fix but no custom-option/negative cases (DEFAULT — must justify higher).
- 3: Default + custom-option + negative cases, all asserting exact output where applicable.
- 4: All of 3 with BVA on the same-dir boundary (IDEAL).
- 5: All of 4 plus property-style coverage of path shapes (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the rule follows the binding SKILL (typed RuleCreator, autofix testing, options schema).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule.
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches custom-rule/RuleTester patterns.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `src/plugins/root-alias.ts`
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| unit | small | @typescript-eslint/rule-tester + vitest | — | Gate 1 |

**Test Cases to Cover**

##### AC: Custom rule ported and functioning (`prefer-alias`)
- [unit] `import ... from '../foo'` resolving under `src` is reported and autofixed to `'@/foo'` (default options) [main]
- [unit] same-directory `import ... from './foo'` (≤2 parts) is NOT reported [edge / BVA at same-dir boundary]
- [unit] custom `{ prefix: '~', sourceDir: 'app' }` reports and autofixes using `~`/`app` [edge]
- [unit] a non-`src` relative import is NOT reported [edge]
- [unit] an import with no leading `.` is ignored (no report) [negative]

---

### Step 5: Port `step-down` Plugin + Tests (High-Risk) [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Steps 3, 4, 6 (MUST be launched in parallel — same dependency: Step 2)

**Goal**: Faithfully port the 245-line scope-walking `src/eslint.plugin.step-down-rule.mjs` to typed `src/plugins/step-down.ts` with **behavior unchanged**, and lock behavior with a RuleTester suite.

**Complexity**: Large
**Uncertainty**: Medium–High (largest, most intricate rule; a subtle port reordering changes lint behavior with no compiler error — analysis Risk #4)
**Dependencies**: Step 2
**Integration Points**: wired (always) by `configs/custom.ts` (Step 7)

#### Expected Output

- `src/plugins/step-down.ts`: typed `{ meta, rules }`, rule `step-down-rule/step-down`, helper boundaries/names unchanged from the `.mjs`
- `tests/plugins/step-down.test.ts`: top-down ordering, decorator/recursive-function/require-bound-name exemptions

#### Success Criteria

- [X] Every helper predicate from the `.mjs` is present with unchanged boundaries/semantics
- [X] Invalid fixtures (incorrect top-down ordering) report the expected `messageId`; valid fixtures (correct ordering, exempted cases) produce no report
- [X] Decorator / recursive-function / require-bound-name exemptions behave identically to the original
- [X] `vitest --run tests/plugins/step-down.test.ts` passes

#### Subtasks

- [X] Write the RuleTester suite FIRST from the current `.mjs` as behavioral spec (valid/invalid + exemptions)
- [X] Port `.mjs` → `.ts` preserving helper structure; convert to `ESLintUtils.RuleCreator`
- [X] Add types incrementally, re-running tests after each change
- [X] Diff behavior against original for the exemption edge cases
- [X] (Iter. 2) Add differential parity test importing the oracle `.mjs`; both rules run over one shared corpus and produce byte-exact identical reports (no divergence found)
- [X] (Iter. 2) Add per-helper → oracle line-range mapping comment to `step-down.ts`
- [X] (Iter. 2) Add class-method caller case exercising the `nameFromScope` MethodDefinition branch

> **Iteration 2 note (parity lock):** Fixtures extracted to a single shared corpus (`tests/plugins/step-down.corpus.ts`) consumed by both the RuleTester spec and the new differential test (`step-down.differential.test.ts`). The differential test imports the original oracle `src/eslint.plugin.step-down-rule.mjs` and asserts the port produces identical reports (messageId + encoded caller/callee + node location) across the full corpus — surfaced **no** parity divergence. Oracle coupling (import + ambient `step-down.oracle.d.ts`) is isolated so Step 9 can delete the oracle by removing just those two files, leaving the spec + corpus intact.

#### Blockers

- Requires Step 2

#### Risks

- **Silent behavior drift during typing** → tests authored before typing; port helpers verbatim then type; re-test after each change (analysis Risk #4)

#### Definition of Done

- [X] All success criteria met; tests written and passing

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/plugins/step-down.ts`, `tests/plugins/step-down.test.ts`
**Threshold:** 4.5/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S5-1 | Is every helper predicate from the `.mjs` present with unchanged boundaries (`findVariablesInScope`, `collectRequiredFunction`, `isViolation`, `isInsideDecorator`, `isNotAFunctionCall`, `isCallingDown`, `isSameScope`, `isNotADeclaration`, `isRecursiveFunction`, `isOuterVariable`, `isFunctionDef`, `resolveCallerName`, `nameFromScope`)? | hard_rule | essential |
| S5-2 | Is the rule exported as typed `{ meta, rules }` with rule id `step-down` via `ESLintUtils.RuleCreator`? | hard_rule | essential |
| S5-3 | Do invalid fixtures (incorrect top-down ordering) report `messageId: 'stepDown'` and valid fixtures produce zero reports? | hard_rule | essential |
| S5-4 | Do the decorator, recursive-function, and require-bound-name exemptions behave identically to the original? | hard_rule | essential |
| S5-5 | Were RuleTester cases authored from the original `.mjs` as a behavioral oracle BEFORE/independently of the typing (spec preserved)? | hard_rule | important |
| S5-6 | Were helpers reordered/merged in a way that changes semantics (must be NO)? | principle | pitfall |
| S5-7 | Is `any` used to bypass node-shape typing in a way that could hide a port mismatch (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Tests pass: `npm run test`
- [X] No code duplication: reuses Step 2 harness
- [X] Reuse honored: `ESLintUtils.RuleCreator` per architecture
- [X] Every `test_matrix` row (main + valid + each exemption) has a corresponding test
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Behavior Parity (violation + all exemptions) | 0.36 |
| Helper-Structure Fidelity | 0.18 |
| Typed-Port Quality | 0.15 |
| Oracle-First Test Coverage | 0.16 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Behavior Parity (violation + all exemptions)

Whether the ported rule reproduces the original's report and every exemption exactly — the dominant risk for this port.

Score Definitions
- 1: A violation or exemption behaves differently from the original.
- 2: Violation path matches but one exemption diverges (DEFAULT — must justify higher).
- 3: Violation + decorator + recursive + require-bound-name + cross/same-scope behaviors all identical.
- 4: All of 3 proven by RuleTester cases mirroring each original branch (IDEAL).
- 5: All of 4 plus differential testing against the original `.mjs` imported directly (OVERLY PERFECT).

##### Helper-Structure Fidelity

Whether helper predicates keep their boundaries/names so future maintenance maps to the original.

Score Definitions
- 1: Helpers collapsed/reshaped, obscuring the original logic.
- 2: Most helpers preserved but some inlined/merged (DEFAULT — must justify higher).
- 3: All named helpers preserved with unchanged boundaries.
- 4: All of 3 with types added without altering control flow (IDEAL).
- 5: All of 4 plus doc comments mapping each helper to the original lines (OVERLY PERFECT).

##### Typed-Port Quality

Whether the port is idiomatic typed ESM (RuleCreator, minimal/justified `any`).

Score Definitions
- 1: Pervasive `any` or non-idiomatic port.
- 2: Typed but with unjustified `any` at node accesses (DEFAULT — must justify higher).
- 3: Fully typed via RuleCreator with precise node types.
- 4: All of 3 with typed scope/reference helpers (IDEAL).
- 5: All of 4 plus exported types reusable elsewhere (OVERLY PERFECT).

##### Oracle-First Test Coverage

Whether tests cover each exemption/violation path and were used as the porting oracle.

Score Definitions
- 1: Only happy-path or missing exemption cases.
- 2: Violation + one exemption (DEFAULT — must justify higher).
- 3: Violation + all three exemptions + cross/same-scope valid cases.
- 4: All of 3 authored before typing as the oracle (IDEAL).
- 5: All of 4 plus regression cases for subtle ordering scenarios (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the port follows the binding SKILL (typed RuleCreator, RuleTester harness, faithful port discipline).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule.
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches custom-rule/RuleTester patterns.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `src/plugins/step-down.ts`
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| unit | small | @typescript-eslint/rule-tester + vitest | — | Gate 1 |

**Test Cases to Cover**

##### AC: Custom rule ported and functioning (`step-down`)
- [unit] incorrect top-down ordering reports `stepDown` [main]
- [unit] correct top-down ordering produces zero reports [valid]
- [unit] decorator usage is NOT reported (decorator exemption) [edge]
- [unit] recursive function call is NOT reported (recursive exemption) [edge]
- [unit] require-bound-name case is NOT reported (require-bound-name exemption) [edge]
- [unit] cross-scope call to a function defined below is valid (no report) [edge]
- [unit] same-scope call to a function defined above is valid (no report) [edge]

---

### Step 6: Plugin-Independent Rule-Group Builders (7) [DONE]

**Model:** sonnet
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Steps 3, 4, 5 (MUST be launched in parallel — same dependency: Step 2)

**Goal**: Author the 7 rule-group builders that depend only on installed third-party plugins (not our ported plugins), transcribing the locked ownership map with full parity: `sonarjs.ts`, `unicorn.ts`, `jsdoc.ts`, `naming.ts`, `complexity.ts`, `stylistic.ts`, `promise.ts`.

**Complexity**: Large (7 files, mechanical transcription — no complex logic)
**Uncertainty**: Low–Medium (ownership boundaries resolved in analysis Risks #5/#7/#10; must not drop a rule)
**Dependencies**: Step 2 (+ Step 1 installed plugins). Independent of Steps 3–5 — runs in parallel with them.
**Integration Points**: consumed by the factory (Step 8); parity verified by the snapshot test (Step 9)

#### Expected Output

- `src/configs/sonarjs.ts` — every sonar rule EXCEPT the 3 naming rules and `sonarjs/cognitive-complexity`
- `src/configs/unicorn.ts` — the unicorn overrides per ownership map
- `src/configs/jsdoc.ts` — the jsdoc group
- `src/configs/naming.ts` — sonarjs class/function/variable-name + `validate-filename/naming-rules` + `test/prefer-lowercase-title:'off'`
- `src/configs/complexity.ts` — core complexity/max-* thresholds + **owns** `sonarjs/cognitive-complexity`
- `src/configs/stylistic.ts` — padding/id-length/no-restricted-syntax/type-definitions/`ts/consistent-type-imports:'off'`(documented)/`perfectionist/sort-named-imports:'off'`
- `src/configs/promise.ts` — registers `eslint-plugin-promise` + `promise/prefer-await-to-then:'error'`
- Each file: signature `(options: ResolvedAgentConfigOptions) => TypedFlatConfigItem[]` + an ownership code comment referencing source line ranges

#### Success Criteria

- [X] Each builder exports `<name>Config(options): TypedFlatConfigItem[]` and compiles under `tsc --noEmit`
- [X] Rule ownership matches the locked map exactly — no rule appears in two builders; `sonarjs/cognitive-complexity` is in `complexity.ts` only
- [X] The 3 parity-fragile overrides are present: `promise/prefer-await-to-then:'error'`, `test/prefer-lowercase-title:'off'`, `perfectionist/sort-named-imports:'off'` (analysis Risk #10)
- [X] `ts/consistent-type-imports:'off'` lands in `stylistic.ts` with a comment documenting the deliberate decision (analysis Risk #7)
- [X] Every builder carries an ownership comment citing its `eslint.config.mjs` source line range

#### Subtasks

- [X] Transcribe `sonarjs.ts` (exclude naming + cognitive-complexity)
- [X] Transcribe `unicorn.ts`, `jsdoc.ts`
- [X] Transcribe `naming.ts` (sonar naming + validate-filename + lowercase-title off)
- [X] Transcribe `complexity.ts` (core thresholds + cognitive-complexity)
- [X] Transcribe `stylistic.ts` (incl. no-restricted-syntax, type-imports-off with comment, sort-named-imports off)
- [X] Transcribe `promise.ts` (register plugin + rule)
- [X] Add ownership comment (source line range) to each file
- [X] Add ambient declarations for untyped runtime plugins (`eslint-plugin-promise`, `eslint-plugin-validate-filename`) so builders compile

#### Blockers

- Requires Step 2 (`ResolvedAgentConfigOptions`, `TypedFlatConfigItem`) and Step 1 plugins

#### Risks

- **Dropped/duplicated rule breaks parity** → follow the locked ownership map; Step 9 snapshot diff against current `eslint.config.mjs` is the safety net (analysis Risks #5/#10)

#### Definition of Done

- [X] All success criteria met; `tsc --noEmit` passes for the 7 builders

#### Verification

**Level:** Per-Builder Judges (7 separate evaluations in parallel — one per builder)
**Artifacts:** `src/configs/{sonarjs,unicorn,jsdoc,naming,complexity,stylistic,promise}.ts`
**Threshold:** 4.0/5.0

Each of the 7 builders is evaluated independently against the checklist + rubric below. The builder-specific ownership rows (S6-B*) apply only to the matching file.

**Checklist (applied per builder):**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S6-1 | Does the builder export `<name>Config(options: ResolvedAgentConfigOptions): TypedFlatConfigItem[]` and compile under `tsc --noEmit`? | hard_rule | essential |
| S6-2 | Do the rules, severities, and rule options match the source `eslint.config.mjs` EXACTLY (none dropped, none invented, no severity/threshold drift)? | hard_rule | essential |
| S6-3 | Are all rules owned by this builder exclusive to it (no rule also emitted by another builder), per the locked Ownership Map? | hard_rule | essential |
| S6-4 | Does the file carry an ownership comment citing its `eslint.config.mjs` source line range? | hard_rule | important |
| S6-B1 | (`sonarjs.ts`) Does it exclude the 3 naming rules AND `sonarjs/cognitive-complexity`? | hard_rule | essential |
| S6-B2 | (`complexity.ts`) Does it own `sonarjs/cognitive-complexity` plus core `complexity`/`max-*` thresholds (e.g. `complexity: ['error', 10]`)? | hard_rule | essential |
| S6-B3 | (`naming.ts`) Does it include sonar class/function/variable-name + `validate-filename/naming-rules` + `test/prefer-lowercase-title: 'off'`? | hard_rule | essential |
| S6-B4 | (`stylistic.ts`) Does it set `ts/consistent-type-imports: 'off'` WITH a documenting comment, `perfectionist/sort-named-imports: 'off'`, and the `no-restricted-syntax` bans? | hard_rule | essential |
| S6-B5 | (`promise.ts`) Does it register `eslint-plugin-promise` and set `promise/prefer-await-to-then: 'error'`? | hard_rule | essential |
| S6-6 | Is any rule silently dropped or duplicated across builders (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] No code duplication: no rule appears in two builders (exclusive ownership)
- [X] Reuse honored: transcribes the exact rules from `eslint.config.mjs` source line ranges

**Rubric (applied per builder):**

| Criterion | Weight |
|-----------|--------|
| Rule Transcription Fidelity | 0.40 |
| Ownership Exclusivity | 0.22 |
| Signature & Compilation | 0.13 |
| Ownership-Comment Accuracy | 0.10 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Rule Transcription Fidelity

Whether every rule, severity, and option is copied from the source exactly — no drops, no inventions, no drift.

Score Definitions
- 1: A rule is dropped, invented, or a severity/threshold changed.
- 2: Rules present but one option/severity subtly drifts (DEFAULT — must justify higher).
- 3: Every rule, severity, and option matches the source line range exactly.
- 4: All of 3 verified line-by-line against the cited source range (IDEAL).
- 5: All of 4 with a per-rule mapping comment to the source (OVERLY PERFECT).

##### Ownership Exclusivity

Whether the builder owns exactly its mapped rules and no rule leaks into another builder.

Score Definitions
- 1: A rule is duplicated across builders or placed in the wrong builder.
- 2: Correct set but a borderline rule's home is ambiguous (DEFAULT — must justify higher).
- 3: Exactly the mapped rules, none shared with another builder.
- 4: All of 3 consistent with the locked Ownership Map for every rule (IDEAL).
- 5: All of 4 plus a comment noting deliberate exclusions (e.g. cognitive-complexity moved to complexity.ts) (OVERLY PERFECT).

##### Signature & Compilation

Whether the builder matches the contract signature and type-checks.

Score Definitions
- 1: Wrong signature or `tsc` fails.
- 2: Compiles but signature deviates (e.g. missing `options` param) (DEFAULT — must justify higher).
- 3: Exact `(options: ResolvedAgentConfigOptions) => TypedFlatConfigItem[]`, compiles clean.
- 4: All of 3 with no `any` and precise return typing (IDEAL).
- 5: All of 4 plus type-level assertion the return is assignable to antfu items (OVERLY PERFECT).

##### Ownership-Comment Accuracy

Whether the required ownership comment cites the correct source line range.

Score Definitions
- 1: No ownership comment.
- 2: Comment present but line range wrong/vague (DEFAULT — must justify higher).
- 3: Accurate ownership comment citing the correct `eslint.config.mjs` line range.
- 4: All of 3 plus a one-line description of what the builder owns (IDEAL).
- 5: All of 4 plus notes on excluded rules and why (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the builder follows the binding SKILL (modular `(resolvedOptions) => TypedFlatConfigItem[]` builder pattern) and preserves the config's opinionated intent.

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. non-modular structure).
- 2: One SKILL deviation OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the modular builder pattern.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

---

### Step 7: Plugin-Wiring Rule-Group Builders (type-aware + custom) [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Steps 3, 4, 5
**Parallel with:** None

**Goal**: Author the 2 builders that wire our ported custom plugins: `type-aware.ts` (strictTypeChecked sliced + type-checked TS rules + wires `no-never-return-type`) and `custom.ts` (wires `root-alias` option-gated + `step-down` always).

**Complexity**: Medium
**Uncertainty**: Medium (`.slice(1)` dedup technique + `projectService` config + option-gating logic)
**Dependencies**: Steps 3, 4, 5 (ported plugins) + Step 2 (types)
**Integration Points**: consumed by the factory (Step 8); `alias` option controls `custom.ts` inclusion of `prefer-alias`

#### Expected Output

- `src/configs/type-aware.ts`: `tseslint.configs.strictTypeChecked.slice(1)` + `parserOptions.projectService: true` (NO `tsconfigRootDir`) + `@typescript-eslint/use-unknown-in-catch-callback-variable` + `@typescript-eslint/only-throw-error` + wires `no-never-return/no-never-return-type`
- `src/configs/custom.ts`: wires `step-down-rule/step-down` (always) + `alias/prefer-alias` gated on `resolved.alias !== false`, feeding `{ prefix, sourceDir }` into rule options

#### Success Criteria

- [X] `type-aware.ts` slices the first element off the tseslint preset (no duplicate plugin registration) and emits `projectService: true` with no `tsconfigRootDir`
- [X] `no-never-return-type` rule is wired active in `type-aware.ts`
- [X] `custom.ts` always emits `step-down`; emits `prefer-alias` with resolved `{ prefix, sourceDir }` only when `alias !== false`, and omits it when `alias: false`
- [X] Both builders compile under `tsc --noEmit` and match their signature `(options) => TypedFlatConfigItem[]`

#### Subtasks

- [X] Author `type-aware.ts` (slice(1), projectService, extra type-checked rules, wire no-never-return)
- [X] Author `custom.ts` (step-down always; prefer-alias option-gated with prefix/sourceDir)
- [X] Add ownership comments citing source line ranges

#### Blockers

- Requires the ported plugins from Steps 3–5

#### Risks

- **Forgetting `.slice(1)` → duplicate TS plugin registration → doubled reports** → covered by a test asserting single registration (skill pattern); snapshot in Step 9 also catches it
- **`tsconfigRootDir` accidentally re-added** → would break consumers; Step 9/Step 11 assert no repo-pinned rootDir (analysis Risk / ADR-3)

#### Definition of Done

- [X] All success criteria met; `tsc --noEmit` passes

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/configs/type-aware.ts`, `src/configs/custom.ts`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S7-1 | Does `type-aware.ts` spread `tseslint.configs.strictTypeChecked.slice(1)` (dropping element `[0]` to avoid duplicate plugin/parser registration)? | hard_rule | essential |
| S7-2 | Does `type-aware.ts` emit `parserOptions.projectService: true` with NO `tsconfigRootDir`? | hard_rule | essential |
| S7-3 | Does `type-aware.ts` add `@typescript-eslint/use-unknown-in-catch-callback-variable` + `@typescript-eslint/only-throw-error` and wire `no-never-return/no-never-return-type` active? | hard_rule | essential |
| S7-4 | Does `custom.ts` always emit the `step-down` rule? | hard_rule | essential |
| S7-5 | Does `custom.ts` emit `prefer-alias` with the resolved `{ prefix, sourceDir }` ONLY when `alias !== false`, and omit it entirely when `alias: false`? | hard_rule | essential |
| S7-6 | Do both builders match the signature `(options: ResolvedAgentConfigOptions) => TypedFlatConfigItem[]` and compile under `tsc --noEmit`? | hard_rule | important |
| S7-7 | Is `.slice(1)` omitted, causing duplicate TS plugin registration (must be NO)? | principle | pitfall |
| S7-8 | Is a repo-pinned `tsconfigRootDir` re-added anywhere (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Reuse honored: imports the ported `no-never-return-type`, `root-alias`, `step-down` plugins from Steps 3–5

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Composition Correctness (slice + projectService) | 0.32 |
| Plugin Wiring | 0.20 |
| Alias Option-Gating | 0.20 |
| Signature / Compilation | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Composition Correctness (slice + projectService)

Whether `strictTypeChecked` is deduplicated via `.slice(1)` and `projectService: true` is emitted without a repo-pinned `tsconfigRootDir`.

Score Definitions
- 1: `.slice(1)` missing (duplicate registration) OR `tsconfigRootDir` pinned.
- 2: One of the two correct, the other wrong/omitted (DEFAULT — must justify higher).
- 3: `.slice(1)` applied AND `projectService: true` with no `tsconfigRootDir`.
- 4: All of 3 with an inline comment explaining the slice + rootDir omission (IDEAL).
- 5: All of 4 plus a guard/comment referencing the SKILL pitfall (OVERLY PERFECT).

##### Plugin Wiring

Whether the ported custom rules are wired active correctly.

Score Definitions
- 1: A custom rule (no-never-return / step-down) not wired.
- 2: Wired but with wrong plugin namespace/id (DEFAULT — must justify higher).
- 3: `no-never-return-type` active in type-aware; `step-down` always in custom.
- 4: All of 3 plus the extra type-checked rules (use-unknown-in-catch, only-throw-error) present (IDEAL).
- 5: All of 4 with correct plugin registration order (OVERLY PERFECT).

##### Alias Option-Gating

Whether `prefer-alias` is present iff `alias !== false`, fed the resolved prefix/sourceDir.

Score Definitions
- 1: Gating wrong (rule present when `alias: false`, or absent by default).
- 2: Gated but resolved `{ prefix, sourceDir }` not fed into rule options (DEFAULT — must justify higher).
- 3: Present iff `alias !== false`; resolved prefix/sourceDir passed as rule options.
- 4: All of 3 with the gating logic total and readable (IDEAL).
- 5: All of 4 with a comment tying gating to the `alias` contract (OVERLY PERFECT).

##### Signature / Compilation

Whether both builders match the contract and type-check.

Score Definitions
- 1: Wrong signature or `tsc` fails.
- 2: Compiles but signature deviates (DEFAULT — must justify higher).
- 3: Exact signature, compiles clean.
- 4: All of 3 with no `any` (IDEAL).
- 5: All of 4 plus type-level return assertions (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether both builders follow the binding SKILL (`.slice(1)` dedup pattern, omit `tsconfigRootDir`, modular builder pattern).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. `tsconfigRootDir` pinned, no slice).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the dedup + projectService patterns.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

> **Test coverage note:** This step authors no tests. The `.slice(1)` single-registration and the `alias` gating are verified by Step 9's snapshot + factory tests and by Step 11's demo E2E.

---

### Step 8: Factory `src/index.ts` + Type Re-exports [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Steps 6, 7
**Parallel with:** None

**Goal**: Rewrite `src/index.ts` as the default-export factory `config(options?, ...userConfigs)` that resolves options, strips `alias`, composes `antfu(antfuOptions, ...ourConfigs, ...userConfigs)`, returns antfu's composer, and re-exports public types.

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Steps 6, 7 (all 9 builders) + Step 2 (types)
**Integration Points**: public entry consumed by demo (Step 11) and tests (Step 9); replaces dummy `fn()`

#### Expected Output

- `src/index.ts`: `resolveOptions(options)` (defaults `alias={prefix:'@',sourceDir:'src'}`), strip `alias` → `antfuOptions`, `ourConfigs.flatMap(fn => fn(resolved))`, `antfu(antfuOptions, ...ourItems, ...userConfigs)`, `return` typed as `ReturnType<typeof antfu>`; re-export `AgentConfigOptions`, `AliasOption`, `TypedFlatConfigItem`

#### Success Criteria

- [X] Default export is a function `config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem[])` returning `ReturnType<typeof antfu>`
- [X] `alias` key is stripped before being forwarded to `antfu()` (never leaks as an antfu option)
- [X] All our builders are composed **before** `...userConfigs` (the override guarantee)
- [X] Public types re-exported from the entry; `tsc --noEmit` passes (`src/index.ts` compiles clean; the sole remaining error is the pre-existing dummy `tests/index.test.ts` importing the now-removed `fn()`, whose deletion is Step 9's scope)
- [X] Dummy `fn()` no longer present in `src/index.ts`

#### Subtasks

- [X] Implement `resolveOptions` with `alias` defaulting and `false` handling
- [X] Strip `alias` from the object forwarded to `antfu()`
- [X] Compose `antfu(antfuOptions, ...ourItems, ...userConfigs)` in that exact order
- [X] Re-export public types; type the return as `ReturnType<typeof antfu>`

#### Blockers

- Requires all 9 builders (Steps 6, 7)

#### Risks

- **`ourItems` emitted after `userConfigs`** → breaks override guarantee; Step 9 identity-ordering test is the guard (skill recommendation #2)
- **`alias` leaking to antfu** → strip explicitly; assert in Step 9 factory test

#### Definition of Done

- [X] All success criteria met; `tsc --noEmit` passes for `src/index.ts` (only the Step-9-scoped dummy `tests/index.test.ts` still errors, since it imports the removed `fn()`)

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `src/index.ts`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S8-1 | Is the default export a function `config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem[])` typed to return `ReturnType<typeof antfu>`? | hard_rule | essential |
| S8-2 | Does `resolveOptions` apply the `alias` default `{ prefix: '@', sourceDir: 'src' }` and correctly handle `alias: false`? | hard_rule | essential |
| S8-3 | Is the `alias` key STRIPPED from the object forwarded to `antfu()` (never leaked as an antfu option)? | hard_rule | essential |
| S8-4 | Is the composition order EXACTLY `antfu(antfuOptions, ...ourItems, ...userConfigs)` — our items before user configs? | hard_rule | essential |
| S8-5 | Are the public types (`AgentConfigOptions`, `AliasOption`, `TypedFlatConfigItem`) re-exported from the entry? | hard_rule | important |
| S8-6 | Is the dummy `fn()` export removed from `src/index.ts`? | hard_rule | essential |
| S8-7 | Are our config items emitted AFTER `...userConfigs`, breaking the override guarantee (must be NO)? | principle | pitfall |
| S8-8 | Does the `alias` option leak into the object passed to `antfu()` (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Reuse honored: composes all 9 builders from Steps 6–7; returns antfu's composer via `ReturnType<typeof antfu>` (no `eslint-flat-config-utils` runtime dep)

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Override-Guarantee Composition Order | 0.30 |
| Options Resolution & Alias Strip | 0.24 |
| Return-Type & Type Re-exports | 0.18 |
| Thin-Factory Delegation | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Override-Guarantee Composition Order

Whether all our config items are emitted before `...userConfigs`, so last-match-wins lets users override anything.

Score Definitions
- 1: User configs emitted before our items (override guarantee broken).
- 2: Correct order but fragile/implicit (e.g. relies on incidental array building) (DEFAULT — must justify higher).
- 3: Exactly `antfu(antfuOptions, ...ourItems, ...userConfigs)`.
- 4: All of 3 with the ordering intent commented (IDEAL).
- 5: All of 4 plus a guard/assertion making mis-ordering impossible (OVERLY PERFECT).

##### Options Resolution & Alias Strip

Whether options resolve with correct defaults and `alias` is stripped before antfu.

Score Definitions
- 1: `alias` leaks to antfu, or defaults wrong.
- 2: Defaults correct but strip incomplete or `false` mishandled (DEFAULT — must justify higher).
- 3: Defaults `{ '@', 'src' }`, `false` handled, `alias` stripped from antfu options.
- 4: All of 3 with `resolveOptions` total and pure (IDEAL).
- 5: All of 4 plus type-level guarantee that antfu options exclude `alias` (OVERLY PERFECT).

##### Return-Type & Type Re-exports

Whether the return type is `ReturnType<typeof antfu>` (ADR-2) and public types are re-exported.

Score Definitions
- 1: Wrong return type or missing re-exports; or imports `FlatConfigComposer` adding a runtime dep.
- 2: Correct return type but a public type not re-exported (DEFAULT — must justify higher).
- 3: `ReturnType<typeof antfu>` return; all public types re-exported.
- 4: All of 3 with no extra runtime dependency introduced (IDEAL).
- 5: All of 4 plus documented re-export surface (OVERLY PERFECT).

##### Thin-Factory Delegation

Whether the factory delegates to builders (no inline rule logic) and the dummy `fn()` is gone.

Score Definitions
- 1: Dummy `fn()` remains, or rules inlined in the factory.
- 2: Delegates but with some inline rule config (DEFAULT — must justify higher).
- 3: Thin factory delegating to the 9 builders; dummy removed.
- 4: All of 3 with a clean `ourConfigs.flatMap(fn => fn(resolved))` composition (IDEAL).
- 5: All of 4 plus a builder registry making additions trivial (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the factory follows the binding SKILL (thin factory over antfu, our rules before user configs, `ReturnType<typeof antfu>`).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. wrong ordering, imports FlatConfigComposer).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the thin-factory pattern.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

> **Test coverage note:** This step authors no tests. Override ordering, antfu passthrough, and `alias` variants are verified by Step 9's factory tests; full rule parity by Step 9's snapshot; end-to-end behavior by Step 11.

---

### Step 9: Factory + Snapshot Tests, Parity Baseline & Legacy Cleanup [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 8
**Parallel with:** Steps 10, 12 (MUST be launched in parallel — same dependency: Step 8)

**Goal**: Verify factory behavior and full rule parity, then retire the legacy files — capturing the parity baseline from the **current** `src/eslint.config.mjs` BEFORE deleting it.

**Complexity**: Large
**Uncertainty**: Medium–High (parity baseline capture + baseline-before-delete ordering — analysis Risk #10)
**Dependencies**: Step 8
**Integration Points**: consumes the built factory output; removes the 4 legacy `src/eslint.*` files + dummy `tests/index.test.ts`

#### Expected Output

- `tests/factory.test.ts`: composer resolution (resolves to non-empty array, is antfu composer), override ordering by object identity/index, antfu passthrough (`config({vue:true})` yields strictly more items — no hardcoded rule names), `alias:false` vs default changes the config set
- `tests/rule-set.snapshot.test.ts`: serialized `{ruleName:severity}` map diffed against a committed baseline extracted from the current `eslint.config.mjs`
- Deletions: `src/eslint.config.mjs`, `src/eslint.plugin.step-down-rule.mjs`, `src/eslint.plugin.root-alias.mjs`, `src/eslint.plugin.no-never-return-type.cjs`, `tests/index.test.ts`

#### Success Criteria

- [X] Factory test asserts the trailing sentinel user config appears **after** all our items (by index/identity) and its override (rule→`off`) takes effect
- [X] Passthrough test proves `config({vue:true})` has strictly more items than `config()` without naming any rule
- [X] `alias:false` vs default produce different config sets (root-alias present/absent)
- [X] Parity baseline was extracted from the ORIGINAL `eslint.config.mjs` and the snapshot matches it (covering all groups: sonarjs, unicorn, jsdoc, naming/validate-filename, complexity thresholds, stylistic/padding/id-length, ESLint core, no-restricted-syntax, and the 3 custom rules)
- [X] After cleanup: no `src/eslint.*.mjs`/`.cjs` remain, dummy `fn()`/`tests/index.test.ts` gone, hardcoded `ignores` removed; `vitest --run` and `tsc --noEmit` still green

#### Subtasks

- [X] Extract the `{ruleName:severity}` baseline from the CURRENT `src/eslint.config.mjs` and commit it as the snapshot baseline (`tests/fixtures/rule-set.baseline.json`, 466 rules)
- [X] Write `tests/factory.test.ts` (resolution, identity ordering, passthrough, alias variants)
- [X] Write `tests/rule-set.snapshot.test.ts` diffing resolved map against the committed baseline
- [X] Only AFTER baseline is committed and green: delete the 4 legacy `src/eslint.*` files + `tests/index.test.ts` (also removed the now-orphaned `step-down.differential.test.ts` + `step-down.oracle.d.ts`, whose sole purpose was oracle parity against the deleted `.mjs`)
- [X] Re-run `vitest --run` + `tsc --noEmit` to confirm green post-deletion

#### Blockers

- Requires Step 8 factory
- **Ordering blocker**: legacy `eslint.config.mjs` MUST NOT be deleted until its rule→severity baseline is captured (recoverable from git `4545706`, but capture-first is the intended path)

#### Risks

- **Baseline lost by early deletion** → deletion is the final subtask, gated on committed baseline (analysis Risk #10)
- **Snapshot merely self-consistent, not vs. real baseline** → test MUST diff against the extracted `eslint.config.mjs` map, not a self-generated one

#### Definition of Done

- [X] All success criteria met; all tests written and passing; legacy files removed

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `tests/factory.test.ts`, `tests/rule-set.snapshot.test.ts`, committed parity baseline; deletions of `src/eslint.*` + `tests/index.test.ts`
**Threshold:** 4.5/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S9-1 | Does the factory test assert the trailing sentinel user config appears AFTER all our items (by array index/object identity) AND that its override (a rule → `off`) takes effect? | hard_rule | essential |
| S9-2 | Does the passthrough test prove `config({ vue: true })` yields strictly MORE items than `config()` WITHOUT referencing any specific rule name? | hard_rule | essential |
| S9-3 | Does a test prove `alias: false` vs default produce different config sets (root-alias present/absent)? | hard_rule | essential |
| S9-4 | Was the `{ ruleName: severity }` baseline extracted from the ORIGINAL `src/eslint.config.mjs` (not self-generated from the new config) and committed, with the snapshot diffed against it? | hard_rule | essential |
| S9-5 | Does the snapshot cover all original groups (sonarjs, unicorn, jsdoc, naming/validate-filename, complexity thresholds, stylistic/padding/id-length, ESLint core, no-restricted-syntax, and the 3 custom rules)? | hard_rule | essential |
| S9-6 | After cleanup: are all 4 `src/eslint.*.mjs/.cjs` files removed, the dummy `fn()`/`tests/index.test.ts` gone, and the hardcoded `ignores` list removed — with `npm run test` + `npm run typecheck` still green? | hard_rule | essential |
| S9-7 | Was the baseline captured and committed BEFORE the legacy `eslint.config.mjs` was deleted (deletion is the final gated subtask)? | hard_rule | essential |
| S9-8 | Is the snapshot merely self-consistent (generated from the new config) rather than diffed against the real original baseline (must be NO)? | principle | pitfall |
| S9-9 | Does the passthrough/ordering test hardcode a specific rule name (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Type check passes: `npm run typecheck`
- [X] Tests pass: `npm run test`
- [X] Every `test_matrix` row (override, passthrough, alias, parity, cleanup) has a corresponding test
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Parity Baseline Integrity | 0.30 |
| Factory Assertions Quality | 0.24 |
| Cleanup Correctness & Ordering | 0.18 |
| Test Robustness | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Parity Baseline Integrity

Whether the snapshot is diffed against a baseline truly extracted from the original config and covers all groups.

Score Definitions
- 1: No real baseline, or snapshot self-generated from the new config.
- 2: Baseline exists but coverage of groups incomplete (DEFAULT — must justify higher).
- 3: Baseline extracted from the original `eslint.config.mjs`; snapshot matches and covers all groups.
- 4: All of 3 with the baseline committed and its provenance documented (IDEAL).
- 5: All of 4 plus a diff report making any future drift reviewable (OVERLY PERFECT).

##### Factory Assertions Quality

Whether factory tests assert structure (identity ordering, item-count passthrough, alias variants) without brittle rule-name coupling.

Score Definitions
- 1: A required factory assertion missing (ordering, passthrough, or alias).
- 2: All three present but one uses a hardcoded rule name (DEFAULT — must justify higher).
- 3: Identity ordering + count-based passthrough + alias variants, no hardcoded rule names.
- 4: All of 3 asserting object identity/index precisely (IDEAL).
- 5: All of 4 plus a test that a user override actually changes resolved severity (OVERLY PERFECT).

##### Cleanup Correctness & Ordering

Whether all legacy artifacts are removed AND deletion happened only after the baseline was committed and green.

Score Definitions
- 1: A legacy file remains, or baseline was lost by early deletion.
- 2: All removed but ordering (baseline-first) not evidently respected (DEFAULT — must justify higher).
- 3: All legacy removed; baseline committed before deletion; suite green post-cleanup.
- 4: All of 3 with the gated ordering documented (IDEAL).
- 5: All of 4 plus verification that `ignores` removal did not change parity (OVERLY PERFECT).

##### Test Robustness

Whether tests resist churn (structure over rule names) and genuinely diff against the real baseline.

Score Definitions
- 1: Tests are self-consistent only or rule-name-brittle.
- 2: Mostly robust but one brittle assertion (DEFAULT — must justify higher).
- 3: Structure-based factory tests + real-baseline snapshot diff.
- 4: All of 3 with clear failure messages guiding review (IDEAL).
- 5: All of 4 plus guardrails preventing accidental snapshot re-baselining (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the tests follow the binding SKILL (override-ordering by object identity, passthrough without rule names, parity snapshot).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL recommendation (e.g. asserts "it doesn't crash" only).
- 2: One SKILL deviation OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches the factory-test recommendations.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `src/index.ts` (factory) resolved output + rule→severity map
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| unit | small | vitest | built/resolved factory output | Gate 1 |
| snapshot | small | vitest (toMatchSnapshot / committed baseline) | rule→severity map vs original-config baseline | Gate 1 |

**Test Cases to Cover**

##### AC: Override guarantee via composition order
- [unit] a trailing sentinel `{ files, rules }` appears after all our items (by index/identity) [main]
- [unit] a user override of one of our rules to `off` takes effect for matched files [main]

##### AC: antfu passthrough / drop-in superset
- [unit] `config({ vue: true })` resolves to strictly more items than `config()` (no rule name referenced) [main]

##### AC: `alias` option behavior
- [unit] `alias: false` omits the root-alias rule; default includes it [edge]

##### AC: Full ruleset parity preserved
- [snapshot] resolved `{ ruleName: severity }` map matches the baseline extracted from the original `eslint.config.mjs`, covering all groups [main]

##### AC: Legacy scaffolding removed
- [unit] post-cleanup the suite is green and no `eslint.*`/dummy artifacts remain [cleanup]

Deliberately skipped: real ESLint CLI run against fixtures — owned by Step 11 E2E.

---

### Step 10: Build + Packaging / Type-Resolution Fix [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 8
**Parallel with:** Steps 9, 12 (MUST be launched in parallel — same dependency: Step 8)

**Goal**: Produce the ESM build via tsdown and reconcile `package.json` `types`/`exports` with the real emitted `dist/` filenames so consumer type resolution works.

**Complexity**: Medium
**Uncertainty**: Medium (analysis Risk #1 — `types` declares `.d.cts` but tsdown emits `.d.mts`)
**Dependencies**: Step 8
**Integration Points**: `package.json` `exports`/`types`, `dist/`, tsdown config (verify-only)

#### Expected Output

- `dist/index.mjs` + `dist/index.d.mts` (verified actual filenames)
- `package.json`: `types` and `exports["."].types` pointing at the actual emitted declaration file
- tsdown config confirmed to resolve `src/index.ts` entry

#### Success Criteria

- [X] `npm run build` succeeds and emits `dist/index.mjs` and a declaration file whose extension matches `package.json` (actual: `dist/index.mjs` + `dist/index.d.mts`)
- [X] `package.json` `types`/`exports` no longer reference the non-existent `.d.cts` (analysis Risk #1) — top-level `types` set to `./dist/index.d.mts`; no `.d.cts` reference remains
- [X] A type-only import of the default export from the built package resolves without error (verified via a `tsc` probe under both `nodenext` and `bundler`; resolved to `dist/index.d.mts`, negative control errored as expected)

#### Subtasks

- [X] Run `npm run build`; list `dist/` and record actual filenames (`index.mjs`, `index.d.mts`)
- [X] Update `package.json` `types` to the real declaration filename (`./dist/index.d.mts`). Note: tsdown `exports:true` regenerates `exports["."]` as a bare string `"./dist/index.mjs"` for pure-ESM packages (dts chunks are excluded from the exports map — see `tsdown/dist/options-Ce3ueyZH.mjs` `genSubExport`), so an explicit `exports["."].types` cannot be persisted without editing the (verify-only) tsdown config; type resolution is instead served by the top-level `types` (node10) and `.mjs`→`.d.mts` extension-adjacency (node16/bundler), both proven by the probe
- [X] Confirm tsdown entry inference (`entry: src/index.ts`) and `exports:true` output against the generated `package.json`; verified that a rebuild preserves the manual top-level `types` fix (tsdown does not touch it for pure-ESM: `types: pkg.types` when `legacy=false`)

#### Blockers

- Requires Step 8 (a real factory to build)

#### Risks

- **`exports:true` regenerates exports map but not legacy `types` field** → manually fix the top-level `types` after build (skill pitfall)

#### Definition of Done

- [X] All success criteria met; dist artifacts + package.json reconciled

> **Implementation note (build-artifact defect — RESOLVED in this step):** An earlier build inlined the entire `typescript` compiler (~7.86 MB) into `dist/index.mjs` and auto-added `inlinedDependencies: { typescript }` to `package.json`; the bundled TS referenced `__filename`, undefined in ESM scope, so a *runtime* `import` threw `ReferenceError: __filename is not defined` (would have blocked Step 11's demo E2E). Root cause: `src/plugins/no-never-return-type.ts` imports `typescript` as a **runtime value** (`ts.TypeFlags.Never`), but `typescript` sat only in `devDependencies`, so tsdown bundled it. Fix: declare `typescript` as a `peerDependency` (`>=4.8.4 <6.1.0`, matching `typescript-eslint`/`@typescript-eslint/utils`, which already peer-depend on it) so tsdown auto-externalizes it, and remove the auto-added `inlinedDependencies` key. `tsdown.config.ts` was left untouched (verify-only honored). After the fix: `dist/index.mjs` is 28 kB, the bundle emits `import * as ts from "typescript"` (external) with zero `__filename` references, a runtime ESM import loads cleanly, and the rebuild is idempotent (no re-added `inlinedDependencies`, `types` preserved).

#### Verification

**Level:** ✅ Single Judge
**Artifact:** `dist/*` (built), `package.json` (`types` + `exports`)
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S10-1 | Does `npm run build` succeed and emit `dist/index.mjs` plus a declaration file? | hard_rule | essential |
| S10-2 | Do `package.json` `types` AND `exports["."].types` point at the ACTUAL emitted declaration filename (e.g. `.d.mts`)? | hard_rule | essential |
| S10-3 | Is every reference to a non-existent `.d.cts` declaration removed from `package.json`? | hard_rule | essential |
| S10-4 | Does a type-only import of the default export resolve without error (verified via a `tsc` probe or the demo)? | hard_rule | important |
| S10-5 | Is a stale legacy top-level `types` field left unreconciled after `exports: true` regeneration (must be NO)? | principle | pitfall |
| S10-6 | Was the declaration extension assumed (`.d.cts`) without inspecting the real `dist/` output (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Build passes: `npm run build`
- [X] Reuse honored: keeps the existing tsdown config (`dts.tsgo`, `exports: true`) — verify only

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Packaging Correctness | 0.40 |
| Build Success & Artifact Presence | 0.24 |
| Type-Resolution Verification | 0.21 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Packaging Correctness

Whether `types`/`exports` reference the real emitted declaration file and no ghost `.d.cts` remains.

Score Definitions
- 1: `types`/`exports` point at a non-existent declaration file.
- 2: `exports.types` correct but legacy top-level `types` stale (or vice versa) (DEFAULT — must justify higher).
- 3: Both `types` and `exports["."].types` match the actual `.d.mts` output; no `.d.cts` reference.
- 4: All of 3 verified against a fresh `dist/` listing (IDEAL).
- 5: All of 4 plus a note/check preventing future drift after rebuilds (OVERLY PERFECT).

##### Build Success & Artifact Presence

Whether the build produces the expected ESM + declaration artifacts.

Score Definitions
- 1: Build fails or `dist/index.mjs` missing.
- 2: Builds but declaration file missing/misnamed (DEFAULT — must justify higher).
- 3: `dist/index.mjs` + declaration emitted as expected.
- 4: All of 3 with actual filenames recorded (IDEAL).
- 5: All of 4 plus verification of the generated `exports` map (OVERLY PERFECT).

##### Type-Resolution Verification

Whether consumer type resolution of the default export is actually proven.

Score Definitions
- 1: No resolution check performed.
- 2: Claimed but not evidenced (DEFAULT — must justify higher).
- 3: A `tsc` probe or demo import resolves the default export + its types.
- 4: All of 3 with the probe committed/reproducible (IDEAL).
- 5: All of 4 across both `node16`/`bundler` resolution modes (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether packaging follows the binding SKILL (verify `package.json` after every build; `exports: true` does not rewrite legacy `types`).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates the SKILL packaging pitfall (stale `.d.cts`).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; package.json reconciled per the SKILL.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

> **Test coverage note:** No test suite is authored here; the type-resolution probe is a build-time check and full resolution is proven by Step 11's demo E2E.

---

### Step 11: Demo E2E Project + `test:e2e` [DONE]

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 10
**Parallel with:** None

**Goal**: Create the `demo/` consumer project (local `file:` dependency) and a `test:e2e` script that builds the package, installs demo deps, and runs ESLint asserting `good.ts` is clean and `bad.ts` reports the expected rule IDs.

**Complexity**: Medium–Large
**Uncertainty**: Medium–High (build→install→lint pipeline ordering + `file:` resolution + type-aware needs resolvable tsconfig — analysis Risk #3)
**Dependencies**: Step 10 (built + correctly-packaged artifacts)
**Integration Points**: `demo/package.json` `file:` ref, real ESLint CLI, root `package.json` `test:e2e` script

#### Expected Output

- `demo/package.json` (`eslint` + `agent-eslint-config` via `file:..`), `demo/eslint.config.mjs` (`export default config()`), `demo/tsconfig.json` (resolvable), `demo/fixtures/good.ts`, `demo/fixtures/bad.ts`
- Root `package.json` `test:e2e` script: build root → `npm install --prefix demo` → run ESLint in `demo/`, asserting on structured JSON rule-ID output

#### Success Criteria

- [X] `test:e2e` runs the ordered pipeline (build → install demo → lint) and fails loudly if any stage fails
- [X] `good.ts` reports zero ESLint errors
- [X] `bad.ts` reports the expected rule IDs (including `step-down`, `prefer-alias`, `no-never-return-type`), asserted from ESLint JSON output (not exit code alone)
- [X] The default import and its types resolve in `demo/` without error (type-resolution proof)

#### Subtasks

- [X] Create `demo/package.json` with `file:..` dependency + eslint
- [X] Create `demo/eslint.config.mjs`, `demo/tsconfig.json`
- [X] Author `demo/fixtures/good.ts` (clean) and `demo/fixtures/bad.ts` (triggers expected rules)
- [X] Add `test:e2e` to root `package.json` with strict build→install→lint ordering + JSON rule-ID assertions

#### Blockers

- Requires Step 10 built + correctly-packaged artifacts (stale `dist/` would mask failures)

#### Risks

- **Stale `dist/` masks real failures** → `test:e2e` rebuilds root first (analysis Risk #3)
- **type-aware parser error in demo** → provide a resolvable `demo/tsconfig.json` covering the fixtures

#### Definition of Done

- [X] All success criteria met; `test:e2e` green end-to-end

#### Verification

**Level:** ✅✅ CRITICAL — Panel of 2 Judges with Aggregated Voting
**Artifact:** `demo/package.json`, `demo/eslint.config.mjs`, `demo/tsconfig.json`, `demo/fixtures/{good,bad}.ts`, root `package.json` `test:e2e`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S11-1 | Does `test:e2e` run the ordered pipeline build → `npm install --prefix demo` → ESLint, rebuilding the root package FIRST, and fail loudly if any stage fails? | hard_rule | essential |
| S11-2 | Does `good.ts` report zero ESLint errors? | hard_rule | essential |
| S11-3 | Does `bad.ts` report the expected rule IDs — including `step-down`, `prefer-alias`, and `no-never-return-type` — asserted from ESLint JSON output (not exit code alone)? | hard_rule | essential |
| S11-4 | Does the demo depend on the package via a local `file:..` reference and resolve the default import + its types without error? | hard_rule | essential |
| S11-5 | Is `demo/tsconfig.json` resolvable so the always-on type-aware layer does not throw a parser error? | hard_rule | important |
| S11-6 | Could a stale `dist/` mask real failures because the root is not rebuilt first (must be NO)? | principle | pitfall |
| S11-7 | Is success asserted by exit code only rather than by inspecting JSON rule IDs (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Build passes: `npm run build`
- [X] E2E passes: `npm run test:e2e`
- [X] Every `test_matrix` row (good, bad, pipeline, resolution) has a corresponding assertion
- [X] Every entry in the **Test Cases to Cover** list has an implemented test

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| E2E Assertion Rigor | 0.32 |
| Pipeline Ordering & Fail-Loud | 0.22 |
| Demo Project Correctness | 0.18 |
| Type-Resolution Proof | 0.13 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### E2E Assertion Rigor

Whether the assertions inspect ESLint JSON rule IDs for `bad.ts` (including the 3 custom rules) and confirm `good.ts` is clean.

Score Definitions
- 1: Asserts by exit code only, or `good.ts` not checked.
- 2: JSON checked but the 3 custom rule IDs not all asserted (DEFAULT — must justify higher).
- 3: `good.ts` clean AND `bad.ts` JSON contains step-down, prefer-alias, no-never-return-type.
- 4: All of 3 with each expected rule ID asserted at least once (IDEAL).
- 5: All of 4 plus assertions on absence of unexpected errors in `good.ts` (OVERLY PERFECT).

##### Pipeline Ordering & Fail-Loud

Whether the pipeline rebuilds root first, installs demo, then lints, failing loudly per stage.

Score Definitions
- 1: No rebuild-first, or a failing stage is swallowed.
- 2: Ordered but a stage failure may not propagate (DEFAULT — must justify higher).
- 3: build → install → lint ordered; each stage fails loudly.
- 4: All of 3 with rebuild-first guaranteeing no stale `dist/` (IDEAL).
- 5: All of 4 plus a clean/isolated demo install each run (OVERLY PERFECT).

##### Demo Project Correctness

Whether the demo uses `file:..`, a resolvable tsconfig, and meaningful good/bad fixtures.

Score Definitions
- 1: Demo does not consume the package via `file:` or fixtures are trivial.
- 2: `file:` ref present but fixtures weak or tsconfig not resolvable (DEFAULT — must justify higher).
- 3: `file:..` dep, resolvable tsconfig, fixtures that meaningfully trigger the intended rules.
- 4: All of 3 with `bad.ts` exercising each custom rule distinctly (IDEAL).
- 5: All of 4 plus fixtures documenting which rule each snippet triggers (OVERLY PERFECT).

##### Type-Resolution Proof

Whether the demo proves the default import + types resolve from the built package.

Score Definitions
- 1: No resolution evidence.
- 2: Import works but types not verified (DEFAULT — must justify higher).
- 3: Default import + its types resolve in the demo without error.
- 4: All of 3 with an explicit type-level use in the demo config (IDEAL).
- 5: All of 4 plus a typecheck step in `test:e2e` (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the E2E follows the binding SKILL (rebuild-before-lint, real consumer via `file:`, resolvable tsconfig for type-aware).

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Violates a binding SKILL rule (e.g. type-aware fails from missing tsconfig).
- 2: One SKILL pitfall present OR SKILL not evidently consulted (DEFAULT — must justify higher).
- 3: No SKILL violations; matches consumer-verification guidance.
- 4: All SKILL rules honored with explicit citation (IDEAL).
- 5: Exceeds SKILL guidance (OVERLY PERFECT).

**Test Strategy:**

**Applies:** true
**Artifact:** `demo/` consumer project + root `test:e2e`
**Criticality:** HIGH

**Test Matrix:**

| Type | Size | Framework | Dependencies | Gate |
|------|------|-----------|--------------|------|
| e2e | large | ESLint CLI (JSON formatter) in `demo/` | built package via `file:..`, demo tsconfig | Gate 3 |
| smoke | large | `test:e2e` shell pipeline | root build + `npm install --prefix demo` | Gate 5 |

**Test Cases to Cover**

##### AC: Demo end-to-end linting
- [e2e] `good.ts` reports zero ESLint errors [main]
- [e2e] `bad.ts` JSON output contains rule IDs `step-down`, `prefer-alias`, `no-never-return-type` (each ≥1) [error path]
- [smoke] the pipeline fails loudly if the build, install, or lint stage fails (rebuild-first) [main]

##### AC: Consumer packaging and type resolution work
- [e2e] the default import and its types resolve in `demo/` without error [main]

Deliberately skipped: cross-ESLint-version matrix (single peer range) and performance/load testing (out of scope).

---

### Step 12: README Rewrite [DONE]

**Model:** opus
**Agent:** sdd:tech-writer
**Depends on:** Step 8
**Parallel with:** Steps 9, 10 (MUST be launched in parallel — same dependency: Step 8)

**Goal**: Update `README.md` to document the real package contract.

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 8 (accurate final API). May run in parallel with Steps 9–11.
**Integration Points**: user-facing docs; keeps existing jscpd/knip section

#### Expected Output

- `README.md` with: correct install command (`agent-eslint-config`, not `@neolabhq/agent-eslint-config`), basic usage, the native `{ files, rules }` override model + composition-order guarantee, the `alias` option, the always-on type-aware tradeoff + escape hatch, covered rule groups/plugins, and the retained jscpd/knip recommendations

#### Success Criteria

- [X] Install command reads `agent-eslint-config`
- [X] Basic usage example (`import config from 'agent-eslint-config'; export default config()`) present
- [X] Documents native override model + last-match-wins ordering guarantee
- [X] Documents `alias` option (default `{prefix:'@',sourceDir:'src'}`, `false` to disable)
- [X] Documents always-on type-aware tradeoff + escape hatch for consumers without a resolvable tsconfig
- [X] Lists covered rule groups/plugins; retains jscpd/knip section

#### Subtasks

- [X] Fix install command
- [X] Add usage + extensibility/ordering section
- [X] Document `alias` option
- [X] Document type-aware tradeoff + escape hatch
- [X] Add rule-groups/plugins summary; preserve jscpd/knip section

#### Blockers

- Requires Step 8 for an accurate API description

#### Risks

- **Docs drift from actual behavior** → write after factory (Step 8) is settled; cross-check the `alias`/ordering claims against the tests

#### Definition of Done

- [X] All success criteria met; README reflects the shipped contract

#### Verification

**Level:** ✅ Single Judge
**Artifact:** `README.md`
**Threshold:** 4.0/5.0

**Checklist:**

| ID | Question | Category | Importance |
|----|----------|----------|------------|
| S12-1 | Does the install command read `agent-eslint-config` (NOT `@neolabhq/agent-eslint-config`)? | hard_rule | essential |
| S12-2 | Is the basic usage example present (`import config from 'agent-eslint-config'; export default config()`)? | hard_rule | essential |
| S12-3 | Does it document the native `{ files, rules }` override model AND the last-match-wins composition-order guarantee? | hard_rule | essential |
| S12-4 | Does it document the `alias` option (default `{ prefix: '@', sourceDir: 'src' }`, `false` to disable)? | hard_rule | essential |
| S12-5 | Does it document the always-on type-aware tradeoff AND the escape hatch for consumers without a resolvable `tsconfig.json`? | hard_rule | essential |
| S12-6 | Does it list the covered rule groups/plugins AND retain the existing `jscpd`/`knip` recommendations? | hard_rule | important |
| S12-7 | Does any documented behavior drift from the shipped factory (e.g. wrong `alias` default) (must be NO)? | principle | pitfall |
| S12-8 | Does the old `@neolabhq/...` install command remain anywhere (must be NO)? | principle | pitfall |

**Regular Checks:**

- [X] Reuse honored: preserves the existing `jscpd`/`knip` section from the current README

**Rubric:**

| Criterion | Weight |
|-----------|--------|
| Contract Accuracy | 0.34 |
| Completeness | 0.28 |
| Clarity & Usability | 0.13 |
| Consistency with codebase terminology | 0.10 |
| Project Guidelines Alignment | 0.15 |

**Rubric Score Definitions:**

##### Contract Accuracy

Whether documented behavior (install name, usage, `alias` defaults, type-aware tradeoff) matches the shipped factory.

Score Definitions
- 1: A documented fact is wrong (e.g. wrong install name or `alias` default).
- 2: Mostly accurate but one claim drifts from actual behavior (DEFAULT — must justify higher).
- 3: All documented facts match the shipped factory.
- 4: All of 3 with claims cross-checked against the factory/tests (IDEAL).
- 5: All of 4 with runnable examples validated against the built package (OVERLY PERFECT).

##### Completeness

Whether all six required topics are present.

Score Definitions
- 1: Two or more required topics missing.
- 2: One required topic missing (DEFAULT — must justify higher).
- 3: All six topics present (install, usage, override model + ordering, alias, type-aware tradeoff + escape hatch, rule groups + jscpd/knip).
- 4: All of 3 with a worked override example (IDEAL).
- 5: All of 4 plus a full covered-rule-group table (OVERLY PERFECT).

##### Clarity & Usability

Whether examples are runnable and the structure is easy to follow.

Score Definitions
- 1: Confusing or non-runnable examples.
- 2: Understandable but examples incomplete (DEFAULT — must justify higher).
- 3: Clear, runnable, well-structured sections.
- 4: All of 3 with copy-pasteable snippets for each option (IDEAL).
- 5: All of 4 plus a quick-start that a new consumer can follow end-to-end (OVERLY PERFECT).

##### Consistency with codebase terminology

Whether terms (config/factory/alias/type-aware) match the code and architecture.

Score Definitions
- 1: Terminology conflicts with the code.
- 2: Minor inconsistencies (DEFAULT — must justify higher).
- 3: Terminology consistent with code and architecture.
- 4: All of 3 with names matching exported symbols (IDEAL).
- 5: All of 4 plus cross-links to option types (OVERLY PERFECT).

##### Project Guidelines Alignment

Whether the README documents the tradeoffs the SKILL/architecture require (type-aware escape hatch, override model) and keeps the jscpd/knip guidance.

HIGH-CRITICALITY guideline: `.claude/skills/eslint-config-authoring/SKILL.md`.

Score Definitions
- 1: Omits a required SKILL/architecture tradeoff (e.g. no escape hatch).
- 2: One SKILL/architecture point under-documented (DEFAULT — must justify higher).
- 3: Documents the required tradeoffs; keeps jscpd/knip.
- 4: All of 3 with explicit reference to the always-on type-aware rationale (IDEAL).
- 5: Exceeds — adds a troubleshooting section for the parser-error escape hatch (OVERLY PERFECT).

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Deps + antfu type confirmation | `package.json` deps/peer/devDeps, confirmed types | M |
| 2 | Type surface + test infra | `src/types.ts`, RuleTester shim, fixture tsconfig, tsconfig include | S/M |
| 3 | Port `no-never-return-type` + test | `src/plugins/no-never-return-type.ts` + test | M |
| 4 | Port `root-alias` (+schema) + test | `src/plugins/root-alias.ts` + test | M |
| 5 | Port `step-down` + test (high-risk) | `src/plugins/step-down.ts` + test | L |
| 6 | 7 plugin-independent builders | `src/configs/{sonarjs,unicorn,jsdoc,naming,complexity,stylistic,promise}.ts` | L |
| 7 | type-aware + custom builders | `src/configs/{type-aware,custom}.ts` | M |
| 8 | Factory | `src/index.ts` factory + type re-exports | M |
| 9 | Factory+snapshot tests + cleanup | `tests/factory.test.ts`, `tests/rule-set.snapshot.test.ts`, legacy files deleted | L |
| 10 | Build + packaging fix | `dist/*`, reconciled `package.json` types/exports | M |
| 11 | Demo E2E | `demo/**`, `test:e2e` script | M/L |
| 12 | README rewrite | `README.md` | M |

**Total Steps**: 12
**Critical Path**: Steps 1 → 2 → 5 → 7 → 8 → 10 → 11 are blocking (Step 5 is the longest plugin port on the path; Step 9 also gates completion after Step 8).
**Parallel Opportunities**:
- Steps 3, 4, 5, 6 run concurrently after Step 2 (4-way parallel).
- Steps 9, 10, 12 run concurrently after Step 8; Step 11 follows Step 10.

---

## Verification Summary

| Step | Verification Level | Judges | Threshold | Artifacts |
|------|-------------------|--------|-----------|-----------|
| 1 | ✅ Single Judge | 1 | 4.0/5.0 | package.json deps/peer/devDeps + antfu type note |
| 2 | ✅✅ Panel (2) | 2 | 4.0/5.0 | src/types.ts, test harness (shim + fixture tsconfig), tsconfig include |
| 3 | ✅✅ Panel (2) | 2 | 4.0/5.0 | src/plugins/no-never-return-type.ts + test |
| 4 | ✅✅ Panel (2) | 2 | 4.0/5.0 | src/plugins/root-alias.ts + test |
| 5 | ✅✅ Panel (2) | 2 | 4.5/5.0 | src/plugins/step-down.ts + test (high-risk) |
| 6 | ✅ Per-Item | 7 | 4.0/5.0 | 7 plugin-independent config builders |
| 7 | ✅✅ Panel (2) | 2 | 4.0/5.0 | src/configs/{type-aware,custom}.ts |
| 8 | ✅✅ Panel (2) | 2 | 4.0/5.0 | src/index.ts factory + re-exports |
| 9 | ✅✅ Panel (2) | 2 | 4.5/5.0 | factory + snapshot tests, parity baseline, legacy cleanup |
| 10 | ✅ Single Judge | 1 | 4.0/5.0 | dist/* + reconciled package.json types/exports |
| 11 | ✅✅ Panel (2) | 2 | 4.0/5.0 | demo/** + root test:e2e |
| 12 | ✅ Single Judge | 1 | 4.0/5.0 | README.md |

**Total Evaluations:** 26 (Single: 3 steps → 3; Panel: 8 steps → 16; Per-Item: 1 step → 7)
**Default Checklist Items:** Included (adapted) in 11 of 12 steps — `npm run build` / `npm run typecheck` (replaces lint; NO eslint dogfooding) / `npm run test`, plus DRY/Boy-Scout/reuse per code step. Test-strategy default items included in Steps 2, 3, 4, 5, 9, 11 (test_strategy.applies=true); dropped in Steps 1, 6, 7, 8, 10, 12 (no tests authored — coverage deferred to Step 9/11).
**Project Guidelines Alignment Dimension:** Included in all 12 of 12 step rubrics (anchored on the binding `eslint-config-authoring` SKILL; no CLAUDE.md/.editorconfig found).
**Test Strategies Defined:** 6 of 12 steps (2, 3, 4, 5, 9, 11).
**Implementation Command:** `/implement .specs/tasks/draft/rewrite-example-config-eslint-package.refactor.md`

---

## Risks & Blockers Summary

### High Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| `step-down` port behavior drift (Step 5, analysis Risk #4) | High | Medium | Author RuleTester suite from `.mjs` spec BEFORE typing; port helpers verbatim; re-test after each change |
| Parity baseline lost by early deletion of `eslint.config.mjs` (Step 9, Risk #10) | High | Medium | Capture `{ruleName:severity}` baseline first; deletion is final gated subtask (also recoverable from git `4545706`) |
| `package.json` `types` `.d.cts` vs actual `.d.mts` (Step 10, Risk #1) | High | High | Rebuild, inspect real `dist/` filenames, fix `types`/`exports`; verify type resolution in demo |
| Demo build→install→lint pipeline / stale `dist` (Step 11, Risk #3) | High | Medium | `test:e2e` rebuilds root first, then `npm install --prefix demo`, then lint; assert JSON rule IDs |
| antfu type surface unverified (Step 1, Risk #2) | Medium | Medium | Read `node_modules/@antfu/eslint-config/dist/*.d.mts` post-install before writing `types.ts` |

### Medium Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Missing `.slice(1)` → duplicate TS plugin (Step 7) | Medium | Low | Test asserting single registration; snapshot catches it |
| Dropped/duplicated rule breaks parity (Step 6, Risks #5/#10) | Medium | Medium | Follow locked ownership map; Step 9 snapshot is the net |
| `min-release-age=7` blocks a dep version (Step 1, Risk #8) | Medium | Medium | Re-verify ages at install; prefer ranges over pins |
| Override guarantee broken by wrong compose order (Step 8) | Medium | Low | Emit our configs before `...userConfigs`; Step 9 identity-ordering test |

---

## High Complexity/Uncertainty Tasks Requiring Attention

**Step 5: Port `step-down` plugin**
- Complexity: High (245-line scope-tree walker with ~10 helper predicates)
- Uncertainty: Medium–High (a subtle TS-port reordering changes lint behavior with no compiler error to catch it)

**Step 9: Factory+snapshot tests, parity baseline & cleanup**
- Complexity: High (two test suites + baseline extraction + gated legacy deletion)
- Uncertainty: Medium–High (baseline must be captured from the original `eslint.config.mjs` before deletion)

**Step 11: Demo E2E pipeline**
- Complexity: Medium–Large (multi-stage build→install→lint pipeline + `file:` resolution + type-aware tsconfig)
- Uncertainty: Medium–High (highest integration risk; failures only surface here)

Recommendations:
1. Consider a spike within Step 5: get the RuleTester suite green against the current `.mjs` (imported directly) before beginning the TS port, so the tests are a proven oracle.
2. Keep Step 9's deletion strictly last and gated on a committed baseline; do not fold deletion into any earlier step.
3. Proceed with Steps 1, 10, 11 as-is with the documented mitigations (no decomposition needed — risk is integration, addressed by ordered scripts and post-build inspection).

---

## Definition of Done (Task Level)

- [X] All 12 implementation steps completed
- [X] All acceptance criteria verified
- [X] Tests written and passing (custom-rule RuleTester suites, factory tests, rule→severity snapshot, demo E2E)
- [X] README updated to the shipped contract
- [X] Package builds and produces the expected `dist/index.mjs` + declaration artifacts with reconciled `package.json`
- [X] Legacy `src/eslint.*` files and dummy scaffolding removed
- [X] No high-priority risk left unaddressed
