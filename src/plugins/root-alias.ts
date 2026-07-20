import type { TSESTree } from '@typescript-eslint/utils'
import path from 'node:path'
import { ESLintUtils } from '@typescript-eslint/utils'
import { DEFAULT_ALIAS } from '../types'

/**
 * `prefer-alias` — ports `src/eslint.plugin.root-alias.mjs` to a typed rule.
 *
 * Flags relative imports (`../foo`) that point inside the configured source
 * directory and rewrites them to the alias form (`@/foo`). The original rule
 * hardcoded the `@` prefix and `src` source dir; this port reads both from a
 * rule options schema so the factory's `alias` option can retune them, while
 * `DEFAULT_ALIAS` keeps the fallback values in a single place (DRY).
 */

/** Rule options: an optional `{ prefix, sourceDir }` object. */
type PreferAliasOptions = [{ prefix?: string, sourceDir?: string }]
/** Single message reported for an aliasable relative import. */
type PreferAliasMessageIds = 'default'

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/rules/${name}.md`,
)

/**
 * Returns true for a same-directory import of at most two path parts (`./foo`),
 * which the original rule intentionally allows to stay relative.
 *
 * @param importPath - the raw import specifier (e.g. `./foo`, `../a/b`)
 */
function isAllowedSameDirImport(importPath: string): boolean {
  const pathParts = importPath.split('/')

  return pathParts[0] === '.' && pathParts.length <= 2
}

/**
 * Resolves an import specifier to its path relative to the project root, split
 * into segments. Returns `null` when the specifier is not a relative import.
 *
 * @param importPath - the raw import specifier
 * @param filename - the absolute-or-relative path of the importing file
 * @param cwd - the project root the resulting path is made relative to
 */
function resolveImportSegments(importPath: string, filename: string, cwd: string): string[] {
  const currentFileDirectory = path.dirname(filename)
  const importFilePath = path.resolve(currentFileDirectory, importPath)
  const importFilePathRelativeRoot = path.relative(cwd, importFilePath)

  return importFilePathRelativeRoot.split(path.sep)
}

export const preferAliasRule = createRule<PreferAliasOptions, PreferAliasMessageIds>({
  name: 'prefer-alias',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Prefer the source-root alias over relative imports that reach into the source directory.',
    },
    messages: {
      default: 'Use alias "{{alias}}" instead of relative import "{{relative}}"',
    },
    schema: [
      {
        type: 'object',
        properties: {
          prefix: { type: 'string' },
          sourceDir: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [DEFAULT_ALIAS],
  create(context, [options]) {
    const prefix = options.prefix ?? DEFAULT_ALIAS.prefix
    const sourceDir = options.sourceDir ?? DEFAULT_ALIAS.sourceDir

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value

        // Only relative imports (leading `.`) can ever be aliased.
        if (importPath.indexOf('.') !== 0)
          return

        if (isAllowedSameDirImport(importPath))
          return

        const importFilePathParts = resolveImportSegments(importPath, context.filename, context.cwd)

        // Only imports that reach into the configured source dir are aliasable.
        if (importFilePathParts.shift() !== sourceDir)
          return

        const aliasedImport = [prefix, ...importFilePathParts].join('/')
        context.report({
          node: node.source,
          messageId: 'default',
          data: { alias: aliasedImport, relative: importPath },
          fix: fixer => fixer.replaceText(node.source, `'${aliasedImport}'`),
        })
      },
    }
  },
})

export default {
  meta: {
    name: 'eslint-plugin-root-alias',
    version: '1.0.0',
  },
  rules: {
    'prefer-alias': preferAliasRule,
  },
}
