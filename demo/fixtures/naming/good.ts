// Clean: functions, classes, and variables use domain names free of the banned
// words (util/common/helper/function) and are at least three characters long.

/**
 * Builds a value.
 * @returns a value
 */
export function buildValue(): number {
  return 1
}

/**
 * A small numeric box.
 */
export class NumberBox {
  private readonly seed = 1

  /**
   * Returns the seed.
   * @returns the seed
   */
  read(): number {
    return this.seed
  }
}

/**
 * Declares well-named, long-enough variables.
 * @returns a value
 */
export function declareGoodNames(): number {
  const totalValue = 5
  const count = 2

  return totalValue + count
}
