import { fileURLToPath } from 'node:url'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { ESLintUtils } from '@typescript-eslint/utils'

/**
 * Sanity tests for the shared test harness (the RuleTester↔vitest shim in
 * `tests/setup.ts` and the type-aware fixture tsconfig in `tests/fixtures/`).
 *
 * These guard the foundation that every custom-rule suite (Steps 3–5) builds on:
 * if the shim regresses, RuleTester throws "Cannot find `describe`"; if the
 * fixture tsconfig stops resolving, type-aware rules lose their parser services.
 */

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/rules/${name}.md`,
)

// AST-only rule: bans the identifier `forbidden`. No type information needed —
// exercises the plain RuleTester path (shim sanity).
const banForbiddenIdentifier = createRule({
  name: 'ban-forbidden-identifier',
  meta: {
    type: 'problem',
    docs: { description: 'Bans an identifier literally named `forbidden`.' },
    messages: { banned: 'Identifier `forbidden` is not allowed.' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Identifier(node) {
        if (node.name === 'forbidden') {
          context.report({ node, messageId: 'banned' })
        }
      },
    }
  },
})

// Type-aware rule: reports a variable whose resolved type is exactly `number`.
// Reaching `getParserServices` at all proves the fixture tsconfig resolved and
// supplied a TS program (fixture sanity).
const banNumberTyped = createRule({
  name: 'ban-number-typed',
  meta: {
    type: 'problem',
    docs: { description: 'Reports a variable declared with the `number` type.' },
    messages: { number: 'Variable is typed as `number`.' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    return {
      VariableDeclarator(node) {
        const type = services.getTypeAtLocation(node.id)
        if (checker.typeToString(type) === 'number') {
          context.report({ node, messageId: 'number' })
        }
      },
    }
  },
})

const FIXTURES_DIR = fileURLToPath(new URL('./fixtures', import.meta.url))

const astRuleTester = new RuleTester()

// a trivial RuleTester run executes under `vitest --run` without "Cannot find describe"
astRuleTester.run('ban-forbidden-identifier', banForbiddenIdentifier, {
  valid: ['const allowed = 1'],
  invalid: [
    {
      code: 'const forbidden = 1',
      errors: [{ messageId: 'banned' }],
    },
  ],
})

const typeAwareRuleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
      tsconfigRootDir: FIXTURES_DIR,
    },
  },
})

// tests/fixtures/tsconfig.json type-checks a sample fixture file: the type-aware
// rule only reports because the fixture tsconfig gave RuleTester a working program.
typeAwareRuleTester.run('ban-number-typed', banNumberTyped, {
  valid: ['const label: string = \'ok\''],
  invalid: [
    {
      code: 'const count: number = 1',
      errors: [{ messageId: 'number' }],
    },
  ],
})
