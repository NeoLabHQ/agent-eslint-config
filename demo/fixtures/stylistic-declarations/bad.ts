// Targets: prefer-const, init-declarations, padding-line-between-statements,
// no-warning-comments

// jscpd:ignore-start
export const marker = 1
// jscpd:ignore-end

/**
 * Uses `let` for a never-reassigned binding and omits the blank line before the
 * return statement.
 * @param value the input
 * @returns the computed value
 */
export function preferConstDemo(value: number): number {
  let doubled = value * 2
  return doubled + 1
}

/**
 * Declares a variable without initialising it at the declaration.
 * @param flag the selector
 * @returns the chosen value
 */
export function initDemo(flag: boolean): number {
  let result: number

  if (flag) {
    result = 1
  }
  else {
    result = 2
  }

  return result
}
