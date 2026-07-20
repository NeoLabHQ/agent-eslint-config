import { RuleTester } from '@typescript-eslint/rule-tester'
import { preferAliasRule } from '../../src/plugins/root-alias'

/**
 * Unit tests for the `prefer-alias` rule (ported from the original
 * `src/eslint.plugin.root-alias.mjs`).
 *
 * The rule is AST-only, so no TS `project`/`projectService` is configured. With
 * relative filenames and no project, RuleTester's Linter uses `process.cwd()` as
 * `context.cwd` and leaves `context.filename` as the given relative path — making
 * the `path.relative(cwd, resolvedImport)` computation deterministic across
 * machines (a relative filename like `src/x.ts` resolves under the repo root).
 *
 * The vitest↔RuleTester shim is applied globally via `tests/setup.ts`
 * (`vitest.config.ts` `setupFiles`), so `RuleTester.run()` works without a
 * per-file import.
 */

const ruleTester = new RuleTester()

ruleTester.run('prefer-alias', preferAliasRule, {
  valid: [
    // Same-directory import (≤2 path parts): must NOT be reported (BVA at the
    // same-dir boundary — the largest same-dir shape the guard still allows).
    {
      code: 'import { foo } from \'./foo\'',
      filename: 'src/components/Button.ts',
    },
    // Relative import that resolves OUTSIDE the source dir: not aliasable.
    {
      code: 'import { foo } from \'../foo\'',
      filename: 'lib/components/Button.ts',
    },
    // Bare module specifier (no leading `.`): ignored entirely.
    {
      code: 'import { foo } from \'lodash\'',
      filename: 'src/components/Button.ts',
    },
    // Custom sourceDir `app`: an import resolving under `src` is no longer
    // aliasable, so it must NOT be reported.
    {
      code: 'import { foo } from \'../foo\'',
      filename: 'src/components/Button.ts',
      options: [{ prefix: '~', sourceDir: 'app' }],
    },
  ],
  invalid: [
    // Default options: a relative import resolving under `src` is reported and
    // autofixed to the `@/…` alias form (exact fixed output asserted).
    {
      code: 'import { foo } from \'../foo\'',
      filename: 'src/components/Button.ts',
      output: 'import { foo } from \'@/foo\'',
      errors: [
        { messageId: 'default', data: { alias: '@/foo', relative: '../foo' } },
      ],
    },
    // Multi-segment path: alias fix preserves every segment under the source dir.
    {
      code: 'import x from \'../../c/d\'',
      filename: 'src/a/b/Button.ts',
      output: 'import x from \'@/c/d\'',
      errors: [{ messageId: 'default', data: { alias: '@/c/d', relative: '../../c/d' } }],
    },
    // Same-dir prefix but >2 parts (`./a/b`): past the ≤2-parts guard, so it is
    // reported (BVA just over the same-dir boundary).
    {
      code: 'import x from \'./a/b\'',
      filename: 'src/x.ts',
      output: 'import x from \'@/a/b\'',
      errors: [{ messageId: 'default' }],
    },
    // Custom `{ prefix, sourceDir }`: both the reported alias and the autofix
    // output use the supplied `~`/`app` values.
    {
      code: 'import { foo } from \'../foo\'',
      filename: 'app/components/Button.ts',
      options: [{ prefix: '~', sourceDir: 'app' }],
      output: 'import { foo } from \'~/foo\'',
      errors: [{ messageId: 'default', data: { alias: '~/foo', relative: '../foo' } }],
    },
    // Partial options: only `prefix` supplied, `sourceDir` falls back to the
    // default `src` — proves defaults are merged, not all-or-nothing.
    {
      code: 'import { foo } from \'../foo\'',
      filename: 'src/components/Button.ts',
      options: [{ prefix: '~' }],
      output: 'import { foo } from \'~/foo\'',
      errors: [{ messageId: 'default', data: { alias: '~/foo', relative: '../foo' } }],
    },
  ],
})
