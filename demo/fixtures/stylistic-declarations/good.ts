// Clean: no jscpd marker comments, `const` for bindings that never change,
// initialise variables at declaration, and pad statements with blank lines.

export const marker = 1

/**
 * Uses `const` and pads the blank line before the return statement.
 * @param value the input
 * @returns the computed value
 */
export function preferConstDemo(value: number): number {
  const doubled = value * 2

  return doubled + 1
}

/**
 * Initialises the variable at its declaration and reassigns it conditionally.
 * @param flag the selector
 * @returns the chosen value
 */
export function initDemo(flag: boolean): number {
  let result = 2

  if (flag) {
    result = 1
  }

  return result
}
