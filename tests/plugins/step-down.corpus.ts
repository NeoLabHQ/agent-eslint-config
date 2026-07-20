import type { InvalidTestCase, ValidTestCase } from '@typescript-eslint/rule-tester'

/**
 * Shared fixture corpus for the `step-down` rule.
 *
 * Single source of truth consumed by BOTH:
 *   - `step-down.test.ts`         — RuleTester behavioral spec (asserts messageId/data)
 *   - `step-down.differential.test.ts` — byte-exact parity against the original oracle
 *
 * Keeping one corpus guarantees the differential parity check runs over exactly
 * the cases the behavioral spec pins, with zero fixture duplication.
 *
 * Every case is derived from the original oracle
 * `src/eslint.plugin.step-down-rule.mjs`; each mirrors a specific branch of its
 * `isViolation` predicate chain, the `this.method()` ordering check, or a
 * `nameFromScope` caller-resolution branch.
 */

type MessageIds = 'stepDown'
type Options = []

export const validCases: ValidTestCase<Options>[] = [
  // Cross-scope call to a function defined BELOW → valid top-down ordering.
  {
    name: 'correct top-down ordering: caller above, callee below',
    code: `
      function main() {
        helper()
      }
      function helper() {}
    `,
  },
  // Explicit cross-scope-below variant (return-position call).
  {
    name: 'cross-scope call to a function defined below is valid',
    code: `
      function caller() {
        return callee()
      }
      function callee() {
        return 1
      }
    `,
  },
  // Same-scope call to a function defined ABOVE → valid (not a top-down violation).
  {
    name: 'same-scope call to a function defined above is valid',
    code: `
      function outer() {
        function inner() {}
        inner()
      }
    `,
  },
  // Decorator factory used before its definition is exempt (isInsideDecorator).
  {
    name: 'decorator usage is not reported',
    code: `
      @Component()
      class Widget {}

      function Component() {
        return (_target: unknown) => {}
      }
    `,
  },
  // Self-recursion is exempt (isRecursiveFunction).
  {
    name: 'recursive function call is not reported',
    code: `
      function factorial(n: number): number {
        return n <= 1 ? 1 : factorial(n - 1)
      }
    `,
  },
  // A name bound to require(...) is exempt (collectRequiredFunction + requiredFunctions).
  {
    name: 'require-bound name is not reported',
    code: `
      const chalk = require('chalk')

      function main() {
        chalk()
      }
    `,
  },
  // Class method calling a method defined BELOW it → valid (indexOf === -1).
  {
    name: 'this.method() calling a method defined below is valid',
    code: `
      class Service {
        first() {
          this.second()
        }
        second() {}
      }
    `,
  },
  // Computed method keys are stored as `undefined` in methodStack (the branch
  // in `MethodDefinition`: `'name' in node.key ? node.key.name : undefined`).
  // A literal key like `['first']` therefore never matches `this.first()`
  // (indexOf('first') === -1), so no report is produced — even though a method
  // spelled `first` textually exists. Contrast with the identifier-keyed
  // invalid case below where `this.first()` IS reported.
  {
    name: 'computed method key is not tracked, so this.<name>() does not match it',
    code: `
      class Service {
        ['first']() {}
        second() {
          this.first()
        }
      }
    `,
  },
  // Destructured require binds are NOT collected by collectRequiredFunction
  // (it narrows to `grandParent.id.type === Identifier`; here the id is an
  // ObjectPattern). The name still produces no report because its binding
  // parent is a Property, not a VariableDeclarator/FunctionDeclaration, so
  // `isNotADeclaration` short-circuits isViolation — matching the oracle.
  {
    name: 'destructured require bind is not reported',
    code: `
      const { x } = require('y')

      function main() {
        x()
      }
    `,
  },
]

export const invalidCases: InvalidTestCase<MessageIds, Options>[] = [
  // Cross-scope call to a function defined ABOVE → violation (Case 2).
  {
    name: 'incorrect top-down ordering: caller below, callee above',
    code: `
      function helper() {}
      function main() {
        helper()
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'helper', caller: 'main' } }],
  },
  // Same-scope call to a function defined BELOW → violation (Case 1).
  {
    name: 'same-scope call to a function defined below is reported',
    code: `
      function outer() {
        inner()
        function inner() {}
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'inner', caller: 'outer' } }],
  },
  // Class method calling a method defined ABOVE it → violation (this.method path).
  {
    name: 'this.method() calling a method defined above is reported',
    code: `
      class Service {
        first() {}
        second() {
          this.first()
        }
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'first', caller: 'second' } }],
  },
  // Caller resolution via the VariableDeclarator branch of nameFromScope:
  // the offending call sits inside an arrow function assigned to `const foo`,
  // so `resolveCallerName` walks the arrow's scope and reports caller 'foo'.
  {
    name: 'caller name resolves through a const-assigned arrow function',
    code: `
      function bar() {}
      const foo = () => {
        bar()
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'bar', caller: 'foo' } }],
  },
  // Caller resolution via the Property branch of nameFromScope: the call sits
  // inside an object-method shorthand `foo() {}`, so the caller resolves to the
  // property key 'foo' (not the enclosing 'obj' variable).
  {
    name: 'caller name resolves through an object-method shorthand',
    code: `
      function bar() {}
      const obj = {
        foo() {
          bar()
        }
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'bar', caller: 'foo' } }],
  },
  // Caller resolution via the MethodDefinition branch of nameFromScope: the
  // offending call sits inside a class method `run() {}`, whose function scope's
  // block is a FunctionExpression parented by a MethodDefinition. The first three
  // nameFromScope branches miss (anonymous method value → no block.id; parent is
  // neither VariableDeclarator nor Property), so caller resolves to the method
  // key 'run' via the MethodDefinition branch (oracle lines 227-229).
  {
    name: 'caller name resolves through a class method (MethodDefinition branch)',
    code: `
      function bar() {}
      class Service {
        run() {
          bar()
        }
      }
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'bar', caller: 'run' } }],
  },
  // Caller resolution falls back to '(unknown)': the call sits inside an
  // anonymous IIFE arrow whose scope (and every scope above it) yields no name
  // from nameFromScope, so resolveCallerName exhausts the chain and returns
  // the '(unknown)' sentinel.
  {
    name: 'caller name falls back to (unknown) for an anonymous IIFE',
    code: `
      function bar() {}
      ;(() => {
        bar()
      })()
    `,
    errors: [{ messageId: 'stepDown', data: { callee: 'bar', caller: '(unknown)' } }],
  },
]
