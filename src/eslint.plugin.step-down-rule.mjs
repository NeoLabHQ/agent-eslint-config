/**
 * ESLint plugin: step-down-rule (ESLint 9 flat config compatible)
 *
 * Enforces top-down call structure — callers appear before callees.
 * Based on https://github.com/skabbi/eslint-plugin-the-step-down-rule
 *
 * ESLint 9 migration: context.getScope() → sourceCode.getScope(node)
 * Fix: decorator factory functions defined after usage are valid top-down.
 */

function createRule() {
  return {
    meta: {
      type: 'suggestion',
      messages: {
        stepDown: 'Expected \'{{callee}}\' to be defined after \'{{caller}}\'. Follow top-to-bottom definitions',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode
      let requiredFunctions = []
      let methodStack = []

      return {
        Program(node) {
          methodStack = []
          requiredFunctions = []
          findVariablesInScope(sourceCode.getScope(node))
        },
        MethodDefinition(node) {
          if (node.kind === 'method') {
            methodStack.push(node.key.name)
          }
        },
        'CallExpression:exit'(node) {
          if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') {
            return
          }

          if (node.callee.object.type !== 'ThisExpression') {
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

      function findVariablesInScope(scope) {
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

      function collectRequiredFunction(reference) {
        if (
          reference?.identifier?.name === 'require'
          && reference.identifier.parent?.parent?.id?.name
        ) {
          requiredFunctions.push(reference.identifier.parent.parent.id.name)
        }
      }

      function isViolation(reference, variable) {
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

      function isInsideDecorator(reference) {
        let node = reference.identifier.parent

        while (node) {
          if (node.type === 'Decorator') {
            return true
          }
          node = node.parent
        }

        return false
      }

      function isNotAFunctionCall(reference) {
        const { parent } = reference.identifier

        return parent.type !== 'CallExpression'
          || reference.identifier.name !== parent.callee?.name
      }

      function isCallingDown(variable, reference) {
        return variable.identifiers[0].range[1] > reference.identifier.range[1]
      }

      function isSameScope(variable, reference) {
        return variable.scope.variableScope === reference.from.variableScope
      }

      function isNotADeclaration(variable) {
        const { type } = variable.identifiers[0].parent

        return type !== 'VariableDeclarator' && type !== 'FunctionDeclaration'
      }

      function isRecursiveFunction(identifier, funcName) {
        if (!identifier.parent) {
          return false
        }

        if (identifier.parent.id?.name === funcName) {
          return true
        }

        return isRecursiveFunction(identifier.parent, funcName)
      }

      function isOuterVariable(variable, reference) {
        return variable.defs[0].type === 'Variable'
          && variable.scope.variableScope !== reference.from.variableScope
      }

      function isFunctionDef(variable) {
        return variable.defs[0].type === 'FunctionName'
      }

      function resolveCallerName(reference) {
        let scope = reference.from

        while (scope) {
          const name = nameFromScope(scope)

          if (name) {
            return name
          }

          scope = scope.upper
        }

        return '(unknown)'
      }

      function nameFromScope(scope) {
        const block = scope.block

        // function foo() {} or async function catchWrapper() {}
        if (block.id?.name) {
          return block.id.name
        }

        // const foo = () => {} or const foo = function() {}
        if (block.parent?.type === 'VariableDeclarator' && block.parent.id?.name) {
          return block.parent.id.name
        }

        // { validate(...args) {} } — object method shorthand
        if (block.parent?.type === 'Property' && block.parent.key?.name) {
          return block.parent.key.name
        }

        // class method: fetchScores() {}
        if (block.parent?.type === 'MethodDefinition' && block.parent.key?.name) {
          return block.parent.key.name
        }

        return null
      }
    },
  }
}

export default {
  meta: {
    name: 'eslint-plugin-step-down-rule',
    version: '1.0.0',
  },
  rules: {
    'step-down': createRule(),
  },
}
