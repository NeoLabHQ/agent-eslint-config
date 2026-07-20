// Clean: the function returns a real value on the happy path (return type is
// `string`, not `never`) and throws inline, so there is no throw-only wrapper.

/**
 * Returns the reason when present, otherwise throws at the call site.
 * @param reason the failure reason
 * @returns the validated reason
 */
export function requireReason(reason: string): string {
  if (reason.length === 0) {
    throw new Error('reason is required')
  }

  return reason
}
