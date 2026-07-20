import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'

/**
 * JSDoc documentation-enforcement rule group.
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 71-90.
 *
 * antfu already bundles and registers `eslint-plugin-jsdoc`, so this builder
 * only overrides rule severities; it does NOT re-register the plugin.
 *
 * @param _options - Resolved factory options (unused: this group is static).
 * @returns The JSDoc flat-config items.
 */
export function jsdocConfig(_options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  return [
    {
      rules: {
        'jsdoc/require-jsdoc': [
          'error',
          {
            require: {
              FunctionDeclaration: true,
              MethodDefinition: true,
              ClassDeclaration: true,
              ArrowFunctionExpression: false,
              FunctionExpression: false,
            },
            checkConstructors: true,
            checkGetters: true,
            checkSetters: true,
          },
        ],
        'jsdoc/require-description': 'error',
        'jsdoc/require-param': 'error',
        'jsdoc/require-returns': 'error',
        'jsdoc/check-param-names': 'error',
        'jsdoc/no-blank-blocks': 'error',
      },
    },
  ]
}
