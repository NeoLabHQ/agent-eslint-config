// Clean: keep at most one loop jump, advance the counter the condition tests,
// and never reassign the counter from inside the loop body.

/**
 * Uses a single break and folds the guard into the accumulation.
 * @param values the values to sum
 * @returns the running total
 */
export function manyJumps(values: number[]): number {
  let total = 0

  for (const value of values) {
    if (value < 0) {
      break
    }

    total += Math.max(value, 0)
  }

  return total
}

/**
 * Advances the same counter the loop condition tests.
 * @param limit the iteration limit
 * @returns the running total
 */
export function misplacedCounter(limit: number): number {
  let total = 0

  for (let i = 0; i < limit; i++) {
    total += i
  }

  return total
}

/**
 * Leaves the loop counter untouched inside the body.
 * @param limit the iteration limit
 * @returns the running total
 */
export function updatedCounter(limit: number): number {
  let total = 0

  for (let i = 0; i < limit; i++) {
    total += i * 2
  }

  return total
}
