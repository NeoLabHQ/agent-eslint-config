// Ambient declarations for the two runtime ESLint plugins that ship no type
// definitions of their own. Both are flat-config plugin objects consumed only
// via `plugins: { ... }` (typed `Record<string, any>` in antfu's
// `TypedFlatConfigItem`), so declaring the default export as `ESLint.Plugin`
// is sufficient and keeps the builders free of implicit-any errors.

declare module 'eslint-plugin-promise' {
  import type { ESLint } from 'eslint'

  const plugin: ESLint.Plugin
  export default plugin
}

declare module 'eslint-plugin-validate-filename' {
  import type { ESLint } from 'eslint'

  const plugin: ESLint.Plugin
  export default plugin
}
