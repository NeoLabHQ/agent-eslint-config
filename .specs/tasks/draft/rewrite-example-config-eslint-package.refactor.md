---
title: Rewrite Example Config as ESLint Package
---

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

## Description

// Will be filled in future stages by business analyst
