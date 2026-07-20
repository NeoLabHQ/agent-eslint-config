// Target: no-never-return/no-never-return-type
// A throw-only wrapper whose resolved return type is `never`. The config wants
// the throw to happen at the call site instead of being hidden in a wrapper.

/**
 * Throws an error built from the given reason.
 * @param reason the failure reason
 */
export function fail(reason: string): never {
  throw new Error(reason)
}
