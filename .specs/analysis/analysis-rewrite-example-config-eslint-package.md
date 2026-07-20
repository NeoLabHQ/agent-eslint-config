# Codebase Impact Analysis: Rewrite Example Config as ESLint Package

> **Mandated skill consulted**: `.claude/skills/eslint-config-authoring/SKILL.md` (required by the task's "Required Skill" line). This analysis cross-references it throughout — most importantly it resolves the antfu type-surface risk below: `FlatConfigComposer` is **not** re-exported by `@antfu/eslint-config`; it lives in `eslint-flat-config-utils` (or is obtained via `ReturnType<typeof antfu>`). See the skill's "Key Concepts" and "Common Pitfalls" tables.

## Summary
- Files to Modify: 5 — `src/index.ts` (full rewrite), `package.json`, `tsconfig.json` (decision point), `README.md`, `tsdown.config.ts` (verify-only)
- Files to Create: 24 — `src/types.ts` ×1, `src/configs/*.ts` ×9, `src/plugins/*.ts` ×3, `tests/**` ×6, `demo/**` ×5
- Files to Delete: 5 — `src/eslint.config.mjs`, 3× `src/eslint.plugin.*`, `tests/index.test.ts`
- Risk Level: Medium-High

## Files to be Created (24, explicit tree)

```
src/
├── index.ts                          # REWRITE: default `config()` factory + type re-exports (deletes dummy fn())
├── types.ts                          # NEW: AgentConfigOptions extends OptionsConfig (antfu) + alias option type
├── configs/                          # 9 builder modules
│   ├── type-aware.ts                 # NEW: tseslint.strictTypeChecked(sliced) + type-checked ts rules (use-unknown-in-catch-callback-variable, only-throw-error) + wires no-never-return-type; parserOptions.projectService:true, NO tsconfigRootDir
│   ├── sonarjs.ts                    # NEW: every sonar rule EXCEPT the 3 naming rules (owned by naming.ts) AND sonarjs/cognitive-complexity (owned by complexity.ts) — includes the sonar control-flow rules (nested-control-flow, elseif-without-else, no-nested-conditional, etc.)
│   ├── unicorn.ts                    # NEW: catch-error-name, prefer-optional-catch-binding, consistent-destructuring, consistent-function-scoping, custom-error-definition, no-lonely-if, no-nested-ternary, no-static-only-class, prefer-class-fields, throw-new-error:off
│   ├── jsdoc.ts                      # NEW: require-jsdoc, require-description, require-param, require-returns, check-param-names, no-blank-blocks
│   ├── naming.ts                     # NEW: sonarjs/class-name|function-name|variable-name + validate-filename/naming-rules + test/prefer-lowercase-title:'off' (antfu override)
│   ├── complexity.ts                 # NEW: complexity, max-depth, max-lines-per-function, max-statements, max-lines, max-nested-callbacks, max-params + sonarjs/cognitive-complexity (its natural companion — see src comment at line 40). Owns cognitive-complexity so sonarjs.ts does not.
│   ├── stylistic.ts                  # NEW: no-warning-comments, prefer-const, init-declarations, id-length, padding-line-between-statements(x6), preserve-caught-error, no-restricted-syntax, @typescript-eslint/consistent-type-definitions, class-methods-use-this (core off + @typescript-eslint/class-methods-use-this), ts/consistent-type-imports:'off' (deliberate keep/drop decision — Risk #7), perfectionist/sort-named-imports:'off' (antfu override)
│   ├── promise.ts                    # NEW: registers eslint-plugin-promise + promise/prefer-await-to-then:'error' (NOT bundled by antfu — must be added by us)
│   └── custom.ts                     # NEW: wires alias/prefer-alias + step-down-rule/step-down plugin blocks (first-party plugins only)
└── plugins/
    ├── step-down.ts                  # NEW: TS port of eslint.plugin.step-down-rule.mjs (246 lines) — highest drift risk
    ├── root-alias.ts                 # NEW: TS port of eslint.plugin.root-alias.mjs (61 lines) — adds options schema [{prefix,sourceDir}]
    └── no-never-return-type.ts       # NEW: TS port of eslint.plugin.no-never-return-type.cjs (139 lines) — CJS→ESM, repoint RuleCreator docs URL

tests/
├── plugins/
│   ├── step-down.test.ts             # NEW: RuleTester valid/invalid
│   ├── root-alias.test.ts            # NEW: RuleTester + autofix output, prefix/sourceDir option variants
│   └── no-never-return-type.test.ts  # NEW: RuleTester, type-aware, parserOptions.project → tests/fixtures/tsconfig.json
├── factory.test.ts                   # NEW: array-resolvable composer; override ordering by index/identity; antfu passthrough; alias:false vs default
├── rule-set.snapshot.test.ts         # NEW: {ruleName: severity} snapshot
└── fixtures/tsconfig.json            # NEW: fixture tsconfig for type-aware RuleTester test

demo/                                  # NEW: E2E fixture project, local file: dependency
├── package.json                      # NEW: agent-eslint-config via "file:.." + eslint peer
├── eslint.config.mjs                 # NEW: import config from 'agent-eslint-config'; export default config()
├── tsconfig.json                     # NEW: resolvable tsconfig (type-aware layer needs it)
└── fixtures/
    ├── good.ts                       # NEW: must lint 0 errors
    └── bad.ts                        # NEW: must trigger expected rule IDs (step-down, prefer-alias, no-never-return-type)
```

New-file count breakdown: `src/types.ts` (1) + `src/configs/*.ts` (9) + `src/plugins/*.ts` (3) + `tests/**` (6) + `demo/**` (5) = **24**.

## Files to Modify

- `package.json` — add runtime `dependencies` (`@antfu/eslint-config`, `typescript-eslint`, `@typescript-eslint/utils`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `eslint-plugin-jsdoc`, `eslint-plugin-validate-filename`, `eslint-plugin-promise`, and **`eslint-flat-config-utils`** — needed to import the `FlatConfigComposer` type, which is NOT exported by `@antfu/eslint-config`; per the mandated skill) + `peerDependencies.eslint` (>=9); reconcile `types` field vs actual tsdown output extension; add devDeps `@typescript-eslint/rule-tester`, `eslint`, `concurrently` (pre-existing gap used by `dev` script)
- `tsconfig.json` — decision point: `include:["src"]` excludes `tests/**`/`demo/**` from `tsc --noEmit`
- `README.md` — fix `npm install @neolabhq/agent-eslint-config` → `agent-eslint-config`; add usage example, extensibility model, `alias` option docs, type-aware tradeoff/escape hatch, rule-group summary; keep jscpd/knip section
- `tsdown.config.ts` — verify only: default entry still resolves `src/index.ts`; confirm actual emitted `.d.ts` extension

## Files to Delete
`src/eslint.config.mjs`, `src/eslint.plugin.no-never-return-type.cjs`, `src/eslint.plugin.root-alias.mjs`, `src/eslint.plugin.step-down-rule.mjs`, `tests/index.test.ts`

## Key Interfaces & Contracts

**VERIFICATION FLAG**: `@antfu/eslint-config` is confirmed NOT installed anywhere in this repo (checked `node_modules`, no `@antfu` dir; not in `package.json`). Every antfu type below (`OptionsConfig`, `TypedFlatConfigItem`) is taken from the task spec's prose plus the `eslint-config-authoring` skill, not from reading antfu's actual `.d.ts`. Must be re-verified by reading `node_modules/@antfu/eslint-config/dist/*.d.mts` immediately after `npm install`, before writing `src/types.ts`/`src/index.ts`. **The one previously-open ambiguity — the `FlatConfigComposer` source — is already resolved by the mandated skill**: it is not re-exported by `@antfu/eslint-config`; import it from `eslint-flat-config-utils`, or avoid naming it via `ReturnType<typeof antfu>`.

| Symbol | Signature | Notes |
|---|---|---|
| `config` (default export, `src/index.ts`) | `function config(options?: AgentConfigOptions, ...userConfigs: TypedFlatConfigItem[]): ReturnType<typeof antfu>` | Return type is antfu's composer. Per the skill, the `FlatConfigComposer` type is **not** importable from `@antfu/eslint-config` — either import it from `eslint-flat-config-utils` or (preferred, dependency-free) type the return as `ReturnType<typeof antfu>`. Internally: `antfu(antfuOptions, ...OUR_configs.flatMap(fn=>fn(resolved)), ...userConfigs)`; `alias` key must be stripped before forwarding to `antfu()` since it isn't a valid antfu option |
| `AliasOption` (`src/types.ts`) | `false \| { prefix?: string; sourceDir?: string }` | Default `{ prefix:'@', sourceDir:'src' }` |
| `AgentConfigOptions` (`src/types.ts`) | `interface AgentConfigOptions extends OptionsConfig { alias?: AliasOption }` | `OptionsConfig` unverified — see flag |
| each `configs/*.ts` (9 files) | `function <name>Config(options: ResolvedAgentConfigOptions): TypedFlatConfigItem[]` | `ResolvedAgentConfigOptions` is internal, not antfu's; `TypedFlatConfigItem` unverified |
| `plugins/root-alias.ts` rule `alias/prefer-alias` | options schema `[{ prefix?: string; sourceDir?: string }]` | NEW schema — current `.mjs` has zero options, hardcoded constants; `fixable:'code'` retained |
| `plugins/no-never-return-type.ts` rule `no-never-return/no-never-return-type` | no options | Requires `ESLintUtils.getParserServices(context)`; RuleCreator docs URL moves from `.../decision-engine/...` to `.../agent-eslint-config/...` |
| `plugins/step-down.ts` rule `step-down-rule/step-down` | no options | Pure structural/scope-walking rule |
| plugin export shape (all 3, verified against current source, not antfu-derived) | `{ meta: { name: string; version: string }, rules: Record<string, RuleModule> }` | Unchanged from current `.mjs`/`.cjs` |

## Integration Points

| File | Relationship | Impact | Action Needed |
|---|---|---|---|
| `package.json` `exports["."]` | Consumer resolves `import config from 'agent-eslint-config'` | High | Confirm still points at tsdown's actual filename after rewrite |
| `package.json` `types` field | Consumer TS resolves types | High | Pre-existing mismatch: declares `.d.cts`, actual build emits `.d.mts` (confirmed: `dist/` contains `index.d.mts`) |
| `tsdown.config.ts` | Compiles `src/index.ts` | Medium | Re-verify entry inference + dts extension once real imports (antfu, tseslint, plugins) exist |
| `tsconfig.json` `include` | Governs `tsc --noEmit` scope | Medium | `tests/**`/`demo/**` excluded — typecheck script silently skips them |
| `demo/package.json` → `file:` ref | Requires its own `npm install` before `eslint` resolves the import | High | `test:e2e` must run build → install demo deps → lint, in that order |
| `demo/eslint.config.mjs` | Only test exercising the real composed config under real ESLint | High | Structural errors in composer nesting only surface here |
| `README.md` install command | User-facing correctness | Low-Medium | Wrong scoped name currently |
| `.npmrc` `min-release-age=7` | Constrains resolvable dep versions | Medium | Don't hardcode scratchpad-captured "latest" versions into `package.json` |

## Reusable Code for Implementation

| Asset | Location | Reuse For |
|---|---|---|
| Full rule/option inventory | `src/eslint.config.mjs` (285 lines, read in full) | Canonical source for every `configs/*.ts` file; no rule may be dropped (snapshot-tested parity) |
| `ESLintUtils.RuleCreator` + `getParserServices` pattern | `src/eslint.plugin.no-never-return-type.cjs:15-53` | Extend to `root-alias.ts` and `step-down.ts` (currently untyped `create(context)`); matches the skill's "Typed custom rule + vitest-integrated RuleTester" pattern |
| antfu composition + `FlatConfigComposer` type | `node_modules/@antfu/eslint-config` (base) + `eslint-flat-config-utils` (composer type) | `AgentConfigOptions extends OptionsConfig`; return composer untouched — re-verify types post-install. Per skill: composer type comes from `eslint-flat-config-utils`, not antfu |

Adaptations needed: `no-never-return-type.cjs` (CJS→ESM, repoint URL, add types); `root-alias.mjs` (add options schema, replace hardcoded constants, consider `context.filename`/`context.cwd` over deprecated getters); `step-down-rule.mjs` (typed scope walking, behavior must stay identical — highest risk); `eslint.config.mjs` rule blocks (split across the 9 `configs/*.ts` files, 3 groups had ambiguous ownership resolved in Risk #5 — including `sonarjs/cognitive-complexity`, now owned by `complexity.ts` — plus 3 stray rules + promise plugin registration resolved in Risk #10).

## Test Coverage

| Test File | Coverage Target |
|---|---|
| `tests/index.test.ts` | DELETE (dummy `fn()` test) |
| `tests/plugins/step-down.test.ts` | Top-down ordering, decorator/recursive-function/require-bound-name exemptions |
| `tests/plugins/root-alias.test.ts` | Default + custom prefix/sourceDir, autofix output, same-dir/non-src imports must not report |
| `tests/plugins/no-never-return-type.test.ts` | `never`-return detection, callback exemption, points at `tests/fixtures/tsconfig.json` |
| `tests/factory.test.ts` | Composer resolution, override ordering, antfu passthrough (no hardcoded rule names), `alias:false` vs default |
| `tests/rule-set.snapshot.test.ts` | Full `{ruleName:severity}` map across every group |
| `demo/` `test:e2e` | `good.ts` 0 errors, `bad.ts` expected rule IDs, via real `eslint` CLI |

## High-Risk Areas (every risk has a distinct mitigation)

| # | Area | Risk | Mitigation |
|---|---|---|---|
| 1 | `package.json` `types` field mismatch | Declares `.d.cts`, actual tsdown output is `.d.mts` (verified against existing `dist/index.d.mts`); breaks the "types resolve without error" acceptance criterion | Rebuild with real `src/index.ts`, inspect actual `dist/` filenames, set `types`/`exports["."].types` to match; add an explicit type-resolution assertion in `demo/` (not just `eslint.config.mjs`, which doesn't exercise the type path). Per skill: `tsdown exports:true` regenerates the `exports` map but NOT the legacy top-level `types` field |
| 2 | Unverified antfu type surface | `OptionsConfig`/`TypedFlatConfigItem` taken from task prose + skill only; package not installed at analysis time. (The `FlatConfigComposer` source is no longer ambiguous — the skill fixes it: it is NOT in `@antfu/eslint-config`, it is in `eslint-flat-config-utils`.) | Read `node_modules/@antfu/eslint-config/dist/*.d.mts` immediately post-install, before writing `src/types.ts`; do not hand-write from memory. Type the composer as `ReturnType<typeof antfu>` (dependency-free) or import `FlatConfigComposer` from `eslint-flat-config-utils` |
| 3 | `demo/` local `file:` + build-then-lint pipeline | Highest integration risk: needs working root build, correct `file:` path resolution, fresh `npm install` in `demo/`, then real `eslint` run; stale `dist/` masks real failures | Explicit ordered `test:e2e` script: `npm run build` (root) → `npm install --prefix demo` → run `eslint` in `demo/`; assert on structured JSON rule-ID output, not exit code alone |
| 4 | `step-down.ts` port fidelity | 246-line scope-tree walker with ~10 helper predicates; a subtle TS-port reordering changes lint behavior with no compiler error to catch it | Port with unchanged helper boundaries/names before adding types; write RuleTester suite against ported-but-untyped version first using current `.mjs` as spec, then add types, re-testing after each change |
| 5 | Ambiguous rule-group file ownership | Task's file layout has `naming.ts` vs `sonarjs.ts` overlap, `sonarjs/cognitive-complexity` claimed by both `sonarjs.ts` and `complexity.ts`, and no named home for `no-restricted-syntax`/throw-catch-safety rules | Resolve explicitly: `naming.ts` = sonarjs class/function/variable-name + validate-filename only; **`complexity.ts` owns `sonarjs/cognitive-complexity`** (alongside the ESLint-core complexity thresholds — its natural companion per the src comment at line 40); `sonarjs.ts` = every other sonar rule (including the sonar control-flow rules), explicitly EXCLUDING the 3 naming rules and `sonarjs/cognitive-complexity`; `no-restricted-syntax` + `@typescript-eslint/class-methods-use-this`/`consistent-type-definitions` → `stylistic.ts`; type-checked throw/catch rules (`use-unknown-in-catch-callback-variable`, `only-throw-error`) → `type-aware.ts`. Document mapping as a code comment in each file |
| 6 | `tsconfig.json` `include` gap | `tests/**`/`demo/**` excluded from `tsc --noEmit`; strict flags never validated on the new test suite | Widen root `include` to `["src","tests"]` or add `tests/tsconfig.json`; wire into existing `lint`/`typecheck` script |
| 7 | `ts/consistent-type-imports: off` carve-out | Current NestJS-specific justification (`src/eslint.config.mjs:34`) doesn't apply to this package's audience; silently keeping/dropping changes ruleset parity | Assign the rule explicitly to `stylistic.ts` (its natural home). Whether it stays `'off'` or is dropped is a **deliberate decision** — document the reasoning as a comment where it lands so the snapshot value is intentional, not accidental |
| 8 | `.npmrc min-release-age=7` vs. exploration-captured versions | Scratchpad-captured "latest" versions (e.g. `@antfu/eslint-config@9.1.0`, per skill's Installation section) aren't filtered by the 7-day gate | Re-resolve via real `npm install` at implementation time; re-run `npm view <pkg> time --json` (per skill) and prefer semver ranges over exact pins; don't hardcode scratchpad versions |
| 9 | `no-never-return-type` requires a real TS `Program` | Consumers with a `tsconfig.json` that doesn't cover linted files get a parser error, not a graceful degrade | Document escape hatch in README explicitly (task already requires this); do not swallow/suppress the error in the plugin — it should surface real consumer misconfiguration |
| 10 | Silent loss of 3 rules + promise plugin registration | `promise/prefer-await-to-then:'error'` (needs the NEW `configs/promise.ts` — antfu does not bundle eslint-plugin-promise), `test/prefer-lowercase-title:'off'` (active override of antfu's `'error'` default → `naming.ts`), `perfectionist/sort-named-imports:'off'` (active override of antfu's enabled-by-default → `stylistic.ts`) each have a home now; omitting any drops opinionated behavior and breaks the "no rules lost" acceptance criterion | Keep `configs/promise.ts` as the 9th config file (plugin registration + rule); re-declare both `'off'` overrides explicitly (verified against `@antfu/eslint-config@9.1.0` source: both are enabled-by-default in antfu, so they are NOT redundant with passthrough); the `rule-set.snapshot.test.ts` MUST diff the resolved `{ruleName:severity}` map against the CURRENT `src/eslint.config.mjs` output, not merely be internally self-consistent, so any future omission is caught |

## Recommended Exploration (read in this order before implementing)
1. `.claude/skills/eslint-config-authoring/SKILL.md` (mandated) — thin-factory pattern, composer-type source, `.slice(1)` tseslint technique, `min-release-age` handling, `types`-field pitfall
2. `src/eslint.config.mjs` (full 285 lines) + `git show 4545706` — canonical rule inventory, confirms no catch-related rules should return
3. `src/eslint.plugin.step-down-rule.mjs` (full 246 lines) — write tests from this before any typing changes
4. `src/eslint.plugin.root-alias.mjs` and `src/eslint.plugin.no-never-return-type.cjs` — concrete, checkable diffs (schema addition; CJS→ESM + URL repoint)
5. `node_modules/@antfu/eslint-config/dist/*.d.mts` (only available post-install) — mandatory before `src/types.ts`
6. `package.json` + `dist/index.d.mts` together — compare declared vs actual types output

## Verification Summary

| Check | Status | Notes |
|---|---|---|
| All affected files identified | Done | 24 new + 5 modified + 5 deleted, explicit paths |
| Integration points mapped | Done | 8 points: build/types/tsconfig/demo(×2)/README/.npmrc |
| Similar patterns found | Done | `src/eslint.config.mjs` is the direct verbatim source; no other configs/plugins structure exists anywhere |
| Reusable code identified | Done | 3 direct-reuse targets (incl. skill patterns) + 4 adaptations, all with file paths |
| Test coverage analyzed | Done | 6 new files + 1 deletion mapped to specific targets |
| Risks assessed | Done | 10 High-Risk-Areas, each with a distinct, concrete mitigation |
| Mandated skill consulted | Done | `eslint-config-authoring` cross-referenced; resolves `FlatConfigComposer` source (Risk #2) and `types`-field pitfall (Risk #1) |

Limitations/Caveats: `@antfu/eslint-config` is not installed as of analysis time — the `OptionsConfig`/`TypedFlatConfigItem` type references here are unverified against real `.d.ts` output (Risk #2); must be the first thing re-checked post-install. The `FlatConfigComposer` source ambiguity is already closed by the mandated skill (`eslint-flat-config-utils`, not `@antfu/eslint-config`).
