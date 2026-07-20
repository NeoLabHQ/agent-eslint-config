import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: true,
  // `typescript` is imported at runtime by the no-never-return-type rule but is
  // intentionally not a dependency/peer: it is provided transitively via
  // typescript-eslint's own `typescript` peer dependency. Keep it external so the
  // build does not inline the whole compiler into the bundle.
  deps: {
    neverBundle: ['typescript'],
  },
})
