// Clean: keep functions shallow, declare them at module scope rather than inside
// blocks or other functions, and never shadow a global binding.

/**
 * Computes the value directly without nested function declarations.
 * @param seed the seed value
 * @returns the computed value
 */
export function deeplyNested(seed: number): number {
  return seed + 5
}

/**
 * Selects the value without declaring a function inside a block.
 * @param flag whether to compute
 * @returns the computed value
 */
export function declInBlock(flag: boolean): number {
  return flag ? 1 : 0
}

/**
 * Uses a local name that does not shadow any global binding.
 * @param value the input value
 * @returns the computed value
 */
export function shadowGlobal(value: number): number {
  const result = value + 1

  return result * 2
}

/**
 * Delegates to a module-scoped function instead of an inner one.
 * @param value the input value
 * @returns the doubled value
 */
export function withInnerScope(value: number): number {
  return double(value)
}

/**
 * Doubles its argument.
 * @param input the number to double
 * @returns the doubled number
 */
function double(input: number): number {
  return input * 2
}
