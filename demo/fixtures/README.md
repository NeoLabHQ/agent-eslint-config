# Demo fixture groups — coverage manifest

Each subdirectory is a **rule group**: a `bad.ts` that deliberately violates a
cluster of related rules and a near-identical `good.ts` that is fully lint-clean
(0 errors, 0 warnings) and type-checks. Fixtures are linted through the real
`agent-eslint-config` via the `demo/` consumer (`eslint --format json` run from
`demo/`, the same way `scripts/verify-demo-e2e.mjs` does) and type-checked by
`tsc --noEmit` in `demo/` (which includes `fixtures/`).

**Verification performed (Step 3):** built the root package (`npm run build`),
then linted every fixture with the demo consumer and ran `tsc --noEmit`. Every
`bad.ts` reports the rule IDs listed for it below; every `good.ts` reports
0 errors / 0 warnings; the whole `fixtures/` tree type-checks (tsc exit 0).

> Rule IDs use the **emitted** namespaces (e.g. `ts/*`, not
> `@typescript-eslint/*`), matching the resolved config and the inventory.

## Groups → rule IDs asserted from `bad.ts`

The "Asserted rule IDs" column lists the inventory rules a group is responsible
for; each is verified to appear in that `bad.ts`. Some `bad.ts` files also emit
incidental base-eslint or cross-group rules (noted under "Also emits"); those are
not part of the group's coverage contract.

| Group directory | Asserted rule IDs (present in `bad.ts`) | Also emits (incidental) |
|---|---|---|
| `imports-alias/` | `alias/prefer-alias` | — |
| `step-down/` | `step-down-rule/step-down` | — |
| `never-return/` | `no-never-return/no-never-return-type` | — |
| `error-handling/` | `ts/only-throw-error`, `sonarjs/no-useless-catch`, `sonarjs/no-try-promise`, `preserve-caught-error`, `unicorn/catch-error-name`, `unicorn/prefer-optional-catch-binding` | `no-useless-catch`, `ts/no-unused-vars`, `unused-imports/no-unused-vars` |
| `control-flow-nesting/` | `sonarjs/nested-control-flow`, `max-depth`, `unicorn/no-lonely-if`, `sonarjs/elseif-without-else`, `sonarjs/no-nested-conditional`, `unicorn/no-nested-ternary`, `sonarjs/no-fallthrough`, `sonarjs/no-same-line-conditional` | `no-fallthrough`, `sonarjs/cognitive-complexity`, `padding-line-between-statements`, `style/max-statements-per-line` |
| `loops/` | `sonarjs/too-many-break-or-continue-in-loop`, `sonarjs/misplaced-loop-counter`, `sonarjs/updated-loop-counter` | `no-unmodified-loop-condition`, `sonarjs/cognitive-complexity` |
| `dead-code-redundancy/` | `sonarjs/no-all-duplicated-branches`, `sonarjs/no-duplicated-branches`, `sonarjs/no-dead-store`, `sonarjs/no-redundant-assignments`, `sonarjs/no-identical-functions`, `sonarjs/no-useless-increment`, `sonarjs/useless-string-operation`, `sonarjs/prefer-immediate-return`, `sonarjs/no-unthrown-error` | `no-new`, `sonarjs/no-nested-incdec` |
| `assignments-nesting/` | `sonarjs/no-nested-assignment`, `sonarjs/no-nested-incdec`, `sonarjs/no-parameter-reassignment`, `sonarjs/destructuring-assignment-syntax`, `unicorn/consistent-destructuring` | `sonarjs/no-dead-store` |
| `scoping/` | `sonarjs/no-nested-functions`, `sonarjs/no-function-declaration-in-block`, `sonarjs/no-globals-shadowing`, `unicorn/consistent-function-scoping` | `jsdoc/require-description` |
| `jsdoc/` | `jsdoc/require-jsdoc`, `jsdoc/require-description`, `jsdoc/require-param`, `jsdoc/require-returns`, `jsdoc/check-param-names`, `jsdoc/no-blank-blocks` | — |
| `naming/` (`bad.ts`) | `sonarjs/function-name`, `sonarjs/class-name`, `sonarjs/variable-name`, `id-length` | — |
| `naming/` (`util-named.bad.ts`) | `validate-filename/naming-rules` | — |
| `complex-function/` | `max-params`, `max-depth`, `sonarjs/cognitive-complexity`, `complexity`, `max-lines-per-function`, `max-statements`, `max-nested-callbacks` | `sonarjs/nested-control-flow`, `unicorn/no-lonely-if`, `sonarjs/no-nested-functions`, `padding-line-between-statements` |
| `max-lines-file/` | `max-lines` | — |
| `complex-class/` | `unicorn/no-static-only-class`, `no-restricted-syntax`, `ts/class-methods-use-this`, `unicorn/prefer-class-fields`, `unicorn/custom-error-definition` | `ts/no-extraneous-class`, `ts/no-useless-constructor` |
| `types/` | `ts/consistent-type-definitions`, `sonarjs/prefer-type-guard`, `ts/no-explicit-any`, `ts/no-non-null-assertion`, `ts/no-unnecessary-condition`, `ts/no-unnecessary-type-assertion` | `ts/no-unsafe-member-access` |
| `promises-async/` | `promise/prefer-await-to-then`, `ts/use-unknown-in-catch-callback-variable`, `ts/no-floating-promises`, `ts/require-await`, `ts/no-misused-promises`, `ts/await-thenable` | `sonarjs/prefer-immediate-return` |
| `stylistic-declarations/` | `prefer-const`, `init-declarations`, `padding-line-between-statements`, `no-warning-comments` | — |
| `security/` | `sonarjs/no-hardcoded-ip`, `sonarjs/no-hardcoded-passwords`, `sonarjs/no-hardcoded-secrets` | — |

### Notes on cross-group coverage

Some inventory rules are demonstrated (asserted) once in their "home" group but
also fire incidentally elsewhere:

- `sonarjs/cognitive-complexity` — home: `complex-function/`; also fires in
  `control-flow-nesting/` and `loops/`.
- `sonarjs/nested-control-flow` + `unicorn/no-lonely-if` — home:
  `control-flow-nesting/`; also fire in `complex-function/`.
- `sonarjs/no-nested-incdec` — home: `assignments-nesting/`; also fires in
  `dead-code-redundancy/`.
- `padding-line-between-statements` — home: `stylistic-declarations/`; also fires
  in `control-flow-nesting/` and `complex-function/`.

`ts/*` rules from the layered `strictTypeChecked` preset that appear as incidental
emissions (e.g. `ts/no-unsafe-member-access`, `ts/no-extraneous-class`,
`ts/no-useless-constructor`, `ts/no-unused-vars`) are demonstrated naturally but
are not part of the 82 explicit-package + 3-custom coverage contract.

## Intentionally NOT covered (with reasons)

These rules cannot be triggered by a self-contained, type-checking `bad.ts`
fixture in this demo, so no fixture fakes them.

| Rule ID | Reason not covered |
|---|---|
| `sonarjs/conditional-indentation` | antfu's `style/indent` (a stylistic fixer layered in the base) normalizes indentation and reports first, so this sonar indentation rule has no mis-indentation left to flag. Superseded, not triggerable here. |
| `sonarjs/no-reference-error` | Triggering it requires referencing an undeclared identifier, which is a TypeScript compile error (`TS2304: Cannot find name …`). Since every `bad.ts` must pass `tsc --noEmit`, this cannot be demonstrated without failing the type-check stage. |
| `sonarjs/os-command` | Requires importing `node:child_process` and calling `exec`/`spawn`. The demo's `tsconfig` sets `types: []` with no `@types/node`, so such an import fails type resolution — a `bad.ts` using it would not type-check. |
| `sonarjs/no-skipped-tests` | Only fires inside test files on `describe.skip`/`it.skip`. No test framework globals are available to a plain `.ts` fixture, and the fixture is not a test file. |
| `sonarjs/stable-tests` | Same as above — a testing-only rule that needs a real test file/framework context. |

### Deliberately-OFF rules (never emit — not fixture-coverable by design)

The config turns these off, so they can never appear in any `bad.ts`:
`unicorn/throw-new-error`, `test/prefer-lowercase-title`,
`ts/consistent-type-imports`, `perfectionist/sort-named-imports`, and core
`class-methods-use-this` (replaced by `ts/class-methods-use-this`).

## Structural decisions

- **Old flat fixtures.** The previous `demo/fixtures/bad.ts` and
  `demo/fixtures/good.ts` (which only exercised the three custom rules) were
  **removed**; their content is migrated into the `imports-alias/`, `step-down/`,
  and `never-return/` groups. `scripts/verify-demo-e2e.mjs` still references the
  old flat paths and is updated in Step 4.
- **`demo/src/thing.ts`** is retained: `imports-alias/bad.ts` imports it via
  `../../src/thing` (which resolves to `src/thing` under the demo root) to trip
  `alias/prefer-alias`.
- **Filename-rule demo file.** `validate-filename/naming-rules` matches on the
  *file name*, so it needs a badly-named file rather than a `bad.ts` body. That
  file is `naming/util-named.bad.ts` — its name contains the banned word `util`;
  its contents are otherwise fully lint-clean, so the only reported problem is the
  filename violation. There is intentionally no `good.ts` counterpart for the
  filename rule (every other correctly-named file is the "good" case).
