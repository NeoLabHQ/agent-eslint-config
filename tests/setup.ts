import * as vitest from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'

/**
 * Wire `@typescript-eslint`'s `RuleTester` onto vitest's test lifecycle.
 *
 * `RuleTester` calls global `describe`/`it`/`afterAll` that it expects a test
 * runner to provide (mocha-style). vitest does not expose these globals to
 * `RuleTester` automatically, so without this shim `RuleTester.run()` throws
 * "Cannot find `describe`". Assigning the vitest equivalents makes every
 * `RuleTester` suite run as native vitest tests.
 *
 * Loaded once for the whole suite via vitest `setupFiles` (see `vitest.config.ts`),
 * so individual rule tests get the shim for free without importing it.
 */
RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe
