// Target: alias/prefer-alias
// A relative import that reaches into the demo's source dir (`../../src/thing`
// resolves to `src/thing` relative to the demo root) must use the `@/…` alias.
import { computeThing } from '../../src/thing'

export const answer = computeThing()
