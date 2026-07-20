import { RuleTester } from '@typescript-eslint/rule-tester'
import { stepDownRule } from '../../src/plugins/step-down'
import { invalidCases, validCases } from './step-down.corpus'

/**
 * Behavioral spec for the `step-down` rule.
 *
 * The valid/invalid cases live in the shared `step-down.corpus` module (a single
 * fixture source of truth) and each mirrors a specific branch of the original
 * oracle `src/eslint.plugin.step-down-rule.mjs` — see the corpus file for the
 * per-case branch annotations. This suite pins the typed port in
 * `src/plugins/step-down.ts` to the expected messageId + report data; the
 * companion `step-down.differential.test.ts` additionally proves byte-exact
 * parity of the port against the oracle over the very same corpus.
 *
 * The shared RuleTester↔vitest shim is applied globally via `tests/setup.ts`
 * (see `vitest.config.ts` setupFiles), so no per-file wiring is needed.
 */

const ruleTester = new RuleTester()

ruleTester.run('step-down', stepDownRule, {
  valid: validCases,
  invalid: invalidCases,
})
