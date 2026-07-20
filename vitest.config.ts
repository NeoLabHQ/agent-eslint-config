import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Applies the RuleTester↔vitest shim (tests/setup.ts) before every test file,
    // so custom-rule suites can call RuleTester.run() without a per-file import.
    setupFiles: ['./tests/setup.ts'],
  },
})
