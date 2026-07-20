/**
 * Import target that lives inside the demo's `src` directory so that a relative
 * import of it from `fixtures/bad.ts` (`../src/thing`) reaches into the source
 * root and is flagged by the `alias/prefer-alias` rule.
 *
 * @returns a constant value used by the demo fixtures
 */
export function computeThing(): number {
  return 42
}
