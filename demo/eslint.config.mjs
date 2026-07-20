// @ts-check
import config from 'agent-eslint-config'

/**
 * Demo flat config: the drop-in usage documented in the README — import the
 * default factory and call it. The JSDoc type annotation below additionally
 * proves the package's `AgentConfigOptions` type resolves in a real consumer.
 *
 * @type {import('agent-eslint-config').AgentConfigOptions}
 */
const options = {}

export default config(options)
