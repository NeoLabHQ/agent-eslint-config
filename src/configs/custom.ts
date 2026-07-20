import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ResolvedAgentConfigOptions } from '../types'
import aliasPlugin from '../plugins/root-alias'
import stepDownPlugin from '../plugins/step-down'

/**
 * Custom-plugin rule group: wires the two AST-only custom rules — `step-down`
 * (always on) and `prefer-alias` (gated on the `alias` option).
 *
 * Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 12-19
 * (`alias` plugin + `prefer-alias` rule) and line 37 (`step-down`). The
 * type-aware `no-never-return` rule is owned by `type-aware.ts`, not here.
 *
 * antfu bundles neither plugin, so both are registered by this builder.
 *
 * The `alias` gating is the only place the bespoke `alias` option changes the
 * emitted rule set: when disabled (`alias: false`) the `prefer-alias` rule and
 * its plugin are omitted entirely; otherwise the resolved `{ prefix, sourceDir }`
 * are fed straight into the rule's options so its reports and autofix use them.
 *
 * @param options - Resolved factory options; `options.alias` gates `prefer-alias`.
 * @returns The custom-plugin flat-config items.
 */
export function customConfig(options: ResolvedAgentConfigOptions): TypedFlatConfigItem[] {
  const items: TypedFlatConfigItem[] = [
    {
      plugins: { 'step-down-rule': stepDownPlugin },
      rules: {
        'step-down-rule/step-down': 'error',
      },
    },
  ]

  // Option-gated: omit the root-alias rule (and its plugin) when `alias: false`.
  if (options.alias !== false) {
    items.push({
      plugins: { alias: aliasPlugin },
      rules: {
        'alias/prefer-alias': [
          'error',
          { prefix: options.alias.prefix, sourceDir: options.alias.sourceDir },
        ],
      },
    })
  }

  return items
}
