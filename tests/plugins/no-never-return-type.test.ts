import { fileURLToPath } from 'node:url'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { ESLintUtils } from '@typescript-eslint/utils'
import plugin from '../../src/plugins/no-never-return-type'

/**
 * Type-aware RuleTester suite for the ported `no-never-return-type` rule.
 *
 * Behavioral spec is the original `src/eslint.plugin.no-never-return-type.cjs`:
 * every reporting/exemption branch below mirrors one of its AST visitors. All
 * `never` returns use explicit `: never` annotations so detection is
 * deterministic regardless of TS inference quirks.
 */

const rule = plugin.rules['no-never-return-type']

// Real on-disk fixtures directory holding tsconfig.json + never-return.ts, so
// the type-aware harness resolves parser services against a REAL project path
// (the reusable pattern established in Step 2) rather than the inferred default
// project. `never-return.ts` is matched by the fixture tsconfig's include glob.
const FIXTURES_DIR = fileURLToPath(new URL('../fixtures', import.meta.url))
const FIXTURE_FILE = fileURLToPath(new URL('../fixtures/never-return.ts', import.meta.url))

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: FIXTURES_DIR,
    },
  },
})

// Harness guard: a probe rule that reports only when the TS program actually
// resolves. Running it first proves parser services resolve against the fixture
// project, so a parser misconfiguration surfaces here rather than silently
// masking the real rule's type-aware logic below.
const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/eslint-rules/${name}`,
)

const parserServicesProbe = createRule({
  name: 'parser-services-probe',
  meta: {
    type: 'problem',
    docs: { description: 'Reports when type-aware parser services resolve.' },
    messages: { resolved: 'Parser services resolved.' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)

    return {
      Program(node) {
        if (services.program.getTypeChecker() != null) {
          context.report({ node, messageId: 'resolved' })
        }
      },
    }
  },
})

ruleTester.run('parser-services-probe', parserServicesProbe, {
  valid: [],
  invalid: [
    {
      code: 'const value: number = 1',
      filename: FIXTURE_FILE,
      errors: [{ messageId: 'resolved' }],
    },
  ],
})

ruleTester.run('no-never-return-type', rule, {
  valid: [
    // a normal-return function produces zero reports [valid/error path]
    {
      code: 'function ok(): number { return 1 }',
      filename: FIXTURE_FILE,
    },
    // a never-returning arrow used as an object `Property` value is NOT reported (callback exemption) [edge]
    {
      code: 'const handlers = { handle: (): never => { throw new Error(\'x\') } }',
      filename: FIXTURE_FILE,
    },
    // a never-returning arrow passed as a `CallExpression` argument is NOT reported (callback exemption) [edge]
    {
      code: 'declare function run(cb: () => never): void; run((): never => { throw new Error(\'x\') })',
      filename: FIXTURE_FILE,
    },
    // a never-returning function expression used as a call argument is also exempt (callback)
    {
      code: 'declare function run(cb: () => never): void; run(function (): never { throw new Error(\'x\') })',
      filename: FIXTURE_FILE,
    },
  ],
  invalid: [
    // a `never`-returning function declaration reports `noNeverReturn` [main]
    {
      code: 'function fail(): never { throw new Error(\'x\') }',
      filename: FIXTURE_FILE,
      errors: [{ messageId: 'noNeverReturn' }],
    },
    // a standalone never-returning `FunctionExpression` is reported [edge]
    {
      code: 'const fail = function (): never { throw new Error(\'x\') }',
      filename: FIXTURE_FILE,
      errors: [{ messageId: 'noNeverReturn' }],
    },
    // a never-returning arrow assigned to a variable (not a callback) is reported
    {
      code: 'const fail = (): never => { throw new Error(\'x\') }',
      filename: FIXTURE_FILE,
      errors: [{ messageId: 'noNeverReturn' }],
    },
    // a class method returning `never` is reported on the `MethodDefinition` [edge]
    {
      code: 'class Thrower { fail(): never { throw new Error(\'x\') } }',
      filename: FIXTURE_FILE,
      errors: [{ messageId: 'noNeverReturn' }],
    },
  ],
})
