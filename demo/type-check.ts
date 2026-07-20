import config, { type AgentConfigOptions } from 'agent-eslint-config'

/**
 * Type-resolution proof for the E2E `typecheck` stage.
 *
 * This file is never linted (only `fixtures/` is), but it IS type-checked by
 * `tsc --noEmit`. It proves the built package's default export (`config`) and
 * its named types (`AgentConfigOptions`, including antfu passthrough fields such
 * as `typescript`) resolve from `dist/` in a real consumer project.
 */
const demoOptions: AgentConfigOptions = {
  typescript: true,
  alias: { prefix: '~', sourceDir: 'app' },
}

export const demoConfig = config(demoOptions)
