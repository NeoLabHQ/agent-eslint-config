/**
 * ESLint plugin: no-never-return-type (ESLint 9 flat config compatible)
 *
 * Bans functions whose return type is `never` — functions that only throw
 * exceptions (used for wrapping or re-throwing errors). These should be
 * restructured to throw at the call site instead.
 *
 * Uses @typescript-eslint type-aware linting to inspect the TypeScript
 * type checker's resolved return type for each function.
 *
 * Typed ESM port of the original `eslint.plugin.no-never-return-type.cjs`;
 * behavior is unchanged, only the docs URL is repointed to this package.
 */

import type { TSESTree } from '@typescript-eslint/utils'
import { ESLintUtils } from '@typescript-eslint/utils'
import * as ts from 'typescript'

/**
 * Function-like nodes whose resolved return type we inspect. `MethodDefinition`
 * itself is never type-checked directly — its inner `value` (one of these) is.
 */
type CheckableFunction
  = | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression
    | TSESTree.TSEmptyBodyFunctionExpression

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/eslint-rules/${name}`,
)

const noNeverReturnType = createRule({
  name: 'no-never-return-type',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow functions that return `never`. Restructure to throw at the call site.' },
    messages: {
      noNeverReturn:
        'Function has return type `never`. Throw directly at the call site instead of wrapping error in a function or throwing as side effect during validation.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    /**
     * Returns true if the given function-like node resolves to a `never`
     * return type in the TypeScript type checker.
     *
     * @param functionNode - ESTree function-like node (declaration, expression, or arrow)
     * @returns whether the function's return type is `never`
     */
    function hasNeverReturnType(functionNode: CheckableFunction): boolean {
      const tsNode = services.esTreeNodeToTSNodeMap.get(functionNode)
      const signature = checker.getSignatureFromDeclaration(tsNode)

      if (!signature) {
        return false
      }

      const returnType = checker.getReturnTypeOfSignature(signature)

      return Boolean(returnType.getFlags() & ts.TypeFlags.Never)
    }

    /**
     * Returns true when the function node is used as a callback — either as
     * an object property value or as an argument in a function/method call.
     * These are intentional throw-only callbacks (e.g. Catch decorator handlers)
     * and should not be flagged.
     *
     * @param node - ESTree function-like node to inspect
     * @returns whether the function is a callback
     */
    function isCallbackFunction(
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
    ): boolean {
      const { parent } = node

      // Object property value: { handle: () => { throw ... } }
      if (parent.type === 'Property' && parent.value === node) {
        return true
      }

      // Direct argument in a function/method call: someFunction(() => { throw ... })
      if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
        return true
      }

      return false
    }

    /**
     * Reports `reportNode` when `functionNode` resolves to a `never` return type.
     *
     * `reportNode` and `functionNode` differ only for class methods, where the
     * inner function is type-checked but the `MethodDefinition` is reported on.
     *
     * @param reportNode - node the violation is reported against
     * @param functionNode - function-like node whose return type is inspected
     */
    function checkAndReport(reportNode: TSESTree.Node, functionNode: CheckableFunction): void {
      if (hasNeverReturnType(functionNode)) {
        context.report({ node: reportNode, messageId: 'noNeverReturn' })
      }
    }

    return {
      FunctionDeclaration(node) {
        checkAndReport(node, node)
      },

      ArrowFunctionExpression(node) {
        if (isCallbackFunction(node)) {
          return
        }

        checkAndReport(node, node)
      },

      // Standalone function expressions (not class methods — those are handled by MethodDefinition)
      FunctionExpression(node) {
        if (node.parent.type === 'MethodDefinition') {
          return
        }

        if (isCallbackFunction(node)) {
          return
        }

        checkAndReport(node, node)
      },

      // Class methods — type-check the inner FunctionExpression, report on the MethodDefinition
      MethodDefinition(node) {
        checkAndReport(node, node.value)
      },
    }
  },
})

export default {
  meta: {
    name: 'eslint-plugin-no-never-return-type',
    version: '1.0.0',
  },
  rules: {
    'no-never-return-type': noNeverReturnType,
  },
}
