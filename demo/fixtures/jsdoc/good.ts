// Clean: every declaration carries a JSDoc block with a description, a @param
// for each parameter (names matching the signature) and a @returns.

/**
 * Returns the value unchanged.
 * @param value the input value
 * @returns the value
 */
export function noJsDoc(value: number): number {
  return value
}

/**
 * Adds one to the value.
 * @param value the input value
 * @returns the incremented value
 */
export function blankBlock(value: number): number {
  return value + 1
}

/**
 * Adds two to the value.
 * @param value the input value
 * @returns the value plus two
 */
export function noDescription(value: number): number {
  return value + 2
}

/**
 * Adds three to the value.
 * @param value the input value
 * @returns the value plus three
 */
export function missingTags(value: number): number {
  return value + 3
}

/**
 * Adds four to the value.
 * @param value the input value
 * @returns the value plus four
 */
export function wrongParamName(value: number): number {
  return value + 4
}
