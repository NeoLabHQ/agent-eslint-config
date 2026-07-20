// Targets: jsdoc/require-jsdoc, jsdoc/require-description, jsdoc/require-param,
// jsdoc/require-returns, jsdoc/check-param-names, jsdoc/no-blank-blocks

export function noJsDoc(value: number): number {
  return value
}

/** */
export function blankBlock(value: number): number {
  return value + 1
}

/**
 * @param value the input value
 * @returns the value
 */
export function noDescription(value: number): number {
  return value + 2
}

/**
 * Adds three but documents neither the parameter nor the return.
 */
export function missingTags(value: number): number {
  return value + 3
}

/**
 * Uses a @param name that does not match the signature.
 * @param wrong the input value
 * @returns the value
 */
export function wrongParamName(value: number): number {
  return value + 4
}
