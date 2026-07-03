/**
 * ESLint plugin: no-never-return-type (ESLint 9 flat config compatible)
 *
 * Bans functions whose return type is `never` — functions that only throw
 * exceptions (used for wrapping or re-throwing errors). These should be
 * restructured to throw at the call site instead.
 *
 * Uses @typescript-eslint type-aware linting to inspect the TypeScript
 * type checker's resolved return type for each function.
 */

const { ESLintUtils } = require('@typescript-eslint/utils')
const ts = require('typescript')

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/NeoLabHQ/decision-engine/blob/master/docs/eslint-rules/${name}`,
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
     * @returns {boolean} whether the function's return type is `never`
     */
    function hasNeverReturnType(functionNode) {
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
     * @returns {boolean} whether the function is a callback
     */
    function isCallbackFunction(node) {
      const { parent } = node

      if (!parent) {
        return false
      }

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
     * Checks a function-like node and reports if it has `never` return type.
     *
     * @param node - the node to report on (may differ from the function node for MethodDefinition)
     * @param functionNode - the function-like node to type-check (defaults to node)
     */
    function checkAndReport(node, functionNode) {
      if (hasNeverReturnType(functionNode ?? node)) {
        context.report({ node, messageId: 'noNeverReturn' })
      }
    }

    return {
      FunctionDeclaration: checkAndReport,

      ArrowFunctionExpression(node) {
        if (isCallbackFunction(node)) {
          return
        }

        checkAndReport(node)
      },

      // Standalone function expressions (not class methods — those are handled by MethodDefinition)
      FunctionExpression(node) {
        if (node.parent.type === 'MethodDefinition') {
          return
        }

        if (isCallbackFunction(node)) {
          return
        }

        checkAndReport(node)
      },

      // Class methods — type-check the inner FunctionExpression, report on the MethodDefinition
      MethodDefinition(node) {
        if (node.value) {
          checkAndReport(node, node.value)
        }
      },
    }
  },
})

module.exports = {
  meta: {
    name: 'eslint-plugin-no-never-return-type',
    version: '1.0.0',
  },
  rules: {
    'no-never-return-type': noNeverReturnType,
  },
}
