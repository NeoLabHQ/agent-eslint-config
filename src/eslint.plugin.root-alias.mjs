import path from 'node:path'

const ROOT_ALIAS = '@'
const SOURCE_DIR = 'src'

function createRule() {
  return {
    meta: {
      type: 'suggestion',
      fixable: 'code',
      messages: {
        default: 'Use alias "{{alias}}" instead of relative import "{{relative}}"',
      },
    },
    create(context) {
      return {
        ImportDeclaration(node) {
          const importPath = node.source.value

          if (importPath.indexOf('.') !== 0)
            return

          const pathParts = importPath.split('/')
          if (pathParts[0] === '.' && pathParts.length <= 2)
            // Allow relative imports from the same directory
            return

          const currentFilePath = context.getFilename()
          const currentFileDirectory = path.dirname(currentFilePath)
          const importFilePath = path.resolve(currentFileDirectory, importPath)

          const importFilePathRelativeRoot = path.relative(context.getCwd(), importFilePath)
          const importFilePathParts = importFilePathRelativeRoot.split(path.sep)
          if (importFilePathParts.shift() !== SOURCE_DIR)
            return

          const importFilePathRelative = [ROOT_ALIAS, ...importFilePathParts].join('/')
          context.report({
            node: node.source,
            messageId: 'default',
            data: { alias: importFilePathRelative, relative: importPath },
            fix(fixer) {
              return fixer.replaceText(node.source, `'${importFilePathRelative}'`)
            },
          })
        },
      }
    },
  }
}

export default {
  meta: {
    name: 'eslint-plugin-root-alias',
    version: '1.0.0',
  },
  rules: {
    'prefer-alias': createRule(),
  },
}
