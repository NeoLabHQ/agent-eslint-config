/**
 * ESLint plugin: step-down-rule (ESLint 9 flat config compatible)
 *
 * Enforces top-down call structure — callers appear before callees.
 * Based on https://github.com/skabbi/eslint-plugin-the-step-down-rule
 *
 * ESLint 9 migration: context.getScope() → sourceCode.getScope(node)
 * Fix: decorator factory functions defined after usage are valid top-down.
 *
 * Typed port of `src/eslint.plugin.step-down-rule.mjs` (behavior unchanged):
 * every helper predicate keeps its original boundaries and semantics; only
 * ESM/typing were added and the rule was rewritten via `ESLintUtils.RuleCreator`.
 * Parity is locked by `tests/plugins/step-down.differential.test.ts`, which runs
 * this port and the oracle `.mjs` over a shared corpus and asserts identical
 * reports.
 *
 * Helper → oracle (`eslint.plugin.step-down-rule.mjs`) line mapping — each helper
 * below is a verbatim transcription of the same-named function in the oracle:
 *   Program handler .......... oracle 25-29
 *   MethodDefinition handler . oracle 30-34
 *   CallExpression:exit ...... oracle 35-58
 *   findVariablesInScope ..... oracle 61-84
 *   collectRequiredFunction .. oracle 86-93
 *   isViolation .............. oracle 95-135
 *   isInsideDecorator ........ oracle 137-148
 *   isNotAFunctionCall ....... oracle 150-155
 *   isCallingDown ............ oracle 157-159
 *   isSameScope .............. oracle 161-163
 *   isNotADeclaration ........ oracle 165-169
 *   isRecursiveFunction ...... oracle 171-181
 *   isOuterVariable .......... oracle 183-186
 *   isFunctionDef ............ oracle 188-190
 *   resolveCallerName ........ oracle 192-206
 *   nameFromScope ............ oracle 208-232
 */
import type { TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES, ESLintUtils, TSESLint } from '@typescript-eslint/utils'

type Scope = TSESLint.Scope.Scope
type Reference = TSESLint.Scope.Reference
type Variable = TSESLint.Scope.Variable

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/rules/${name}.md`,
)

export const stepDownRule = createRule({
  name: 'step-down',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce top-down call structure — callers appear before callees.',
    },
    messages: {
      stepDown: 'Expected \'{{callee}}\' to be defined after \'{{caller}}\'. Follow top-to-bottom definitions',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode
    // Names bound to `require(...)` calls (e.g. `const foo = require('foo')`);
    // calls to them are exempt from the top-down check.
    let requiredFunctions: string[] = []
    // Class method names in source order, used by the `this.method()` check.
    // Faithful to the original: entries may be `undefined` for non-identifier
    // (computed/literal) method keys so index positions are preserved.
    let methodStack: Array<string | undefined> = []

    return {
      Program(node) {
        methodStack = []
        requiredFunctions = []
        findVariablesInScope(sourceCode.getScope(node))
      },
      MethodDefinition(node) {
        if (node.kind === 'method') {
          // Mirrors the original `node.key.name`: a string for identifier keys,
          // `undefined` for computed/literal keys.
          methodStack.push('name' in node.key ? node.key.name : undefined)
        }
      },
      'CallExpression:exit'(node) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression || node.callee.property.type !== AST_NODE_TYPES.Identifier) {
          return
        }

        if (node.callee.object.type !== AST_NODE_TYPES.ThisExpression) {
          return
        }

        const calledMethodName = node.callee.property.name
        const calledIndex = methodStack.indexOf(calledMethodName)

        if (calledIndex === -1 || calledIndex >= methodStack.length - 1) {
          return
        }

        const callerName = methodStack[methodStack.length - 1] ?? '(unknown)'

        context.report({
          node,
          messageId: 'stepDown',
          data: { callee: calledMethodName, caller: callerName },
        })
      },
    }

    function findVariablesInScope(scope: Scope): void {
      for (const reference of scope.references) {
        const variable = reference.resolved

        collectRequiredFunction(reference)

        if (!isViolation(reference, variable)) {
          continue
        }

        context.report({
          node: reference.identifier,
          messageId: 'stepDown',
          data: {
            callee: reference.identifier.name,
            caller: resolveCallerName(reference),
          },
        })
      }

      for (const childScope of scope.childScopes) {
        findVariablesInScope(childScope)
      }
    }

    function collectRequiredFunction(reference: Reference): void {
      const grandParent = reference.identifier.parent?.parent

      if (
        reference.identifier.name === 'require'
        && grandParent?.type === AST_NODE_TYPES.VariableDeclarator
        && grandParent.id.type === AST_NODE_TYPES.Identifier
      ) {
        requiredFunctions.push(grandParent.id.name)
      }
    }

    function isViolation(reference: Reference, variable: Variable | null): boolean {
      if (reference.init || !variable || variable.identifiers.length === 0) {
        return false
      }

      if (isInsideDecorator(reference)) {
        return false
      }

      if (isNotAFunctionCall(reference)) {
        return false
      }

      // Cross-scope call to a function defined below → valid top-down
      if (isCallingDown(variable, reference) && !isSameScope(variable, reference)) {
        return false
      }

      // Same-scope call to a function defined above → valid (not top-down violation)
      if (isSameScope(variable, reference) && !isCallingDown(variable, reference)) {
        return false
      }

      if (requiredFunctions.includes(reference.identifier.name)) {
        return false
      }

      if (isNotADeclaration(variable)) {
        return false
      }

      if (isRecursiveFunction(reference.identifier, reference.identifier.name)) {
        return false
      }

      if (!isOuterVariable(variable, reference) && !isFunctionDef(variable)) {
        return false
      }

      return true
    }

    function isInsideDecorator(reference: Reference): boolean {
      let node: TSESTree.Node | undefined = reference.identifier.parent

      while (node) {
        if (node.type === AST_NODE_TYPES.Decorator) {
          return true
        }
        node = node.parent
      }

      return false
    }

    function isNotAFunctionCall(reference: Reference): boolean {
      const parent = reference.identifier.parent

      return parent.type !== AST_NODE_TYPES.CallExpression
        || parent.callee.type !== AST_NODE_TYPES.Identifier
        || reference.identifier.name !== parent.callee.name
    }

    function isCallingDown(variable: Variable, reference: Reference): boolean {
      // `identifiers[0]` is guaranteed present by the `identifiers.length === 0`
      // guard in `isViolation`, the sole entry point to these predicates.
      return variable.identifiers[0]!.range[1] > reference.identifier.range[1]
    }

    function isSameScope(variable: Variable, reference: Reference): boolean {
      return variable.scope.variableScope === reference.from.variableScope
    }

    function isNotADeclaration(variable: Variable): boolean {
      const { type } = variable.identifiers[0]!.parent

      return type !== AST_NODE_TYPES.VariableDeclarator && type !== AST_NODE_TYPES.FunctionDeclaration
    }

    function isRecursiveFunction(identifier: TSESTree.Node, funcName: string): boolean {
      const parent = identifier.parent

      if (!parent) {
        return false
      }

      if ('id' in parent && parent.id && 'name' in parent.id && parent.id.name === funcName) {
        return true
      }

      return isRecursiveFunction(parent, funcName)
    }

    function isOuterVariable(variable: Variable, reference: Reference): boolean {
      return variable.defs[0]!.type === TSESLint.Scope.DefinitionType.Variable
        && variable.scope.variableScope !== reference.from.variableScope
    }

    function isFunctionDef(variable: Variable): boolean {
      return variable.defs[0]!.type === TSESLint.Scope.DefinitionType.FunctionName
    }

    function resolveCallerName(reference: Reference): string {
      let scope: Scope | null = reference.from

      while (scope) {
        const name = nameFromScope(scope)

        if (name) {
          return name
        }

        scope = scope.upper
      }

      return '(unknown)'
    }

    function nameFromScope(scope: Scope): string | null {
      const block = scope.block

      // function foo() {} or async function catchWrapper() {}
      if ('id' in block && block.id && 'name' in block.id) {
        return block.id.name
      }

      const parent = block.parent

      // const foo = () => {} or const foo = function() {}
      if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) {
        return parent.id.name
      }

      // { validate(...args) {} } — object method shorthand
      if (parent?.type === AST_NODE_TYPES.Property && parent.key.type === AST_NODE_TYPES.Identifier) {
        return parent.key.name
      }

      // class method: fetchScores() {}
      if (parent?.type === AST_NODE_TYPES.MethodDefinition && parent.key.type === AST_NODE_TYPES.Identifier) {
        return parent.key.name
      }

      return null
    }
  },
})

const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-step-down-rule',
    version: '1.0.0',
  },
  rules: {
    'step-down': stepDownRule,
  },
}

export default plugin
