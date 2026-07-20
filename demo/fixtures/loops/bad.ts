// Targets: sonarjs/too-many-break-or-continue-in-loop,
// sonarjs/misplaced-loop-counter, sonarjs/updated-loop-counter

/**
 * Uses more than one break/continue in a single loop.
 * @param values the values to sum
 * @returns the running total
 */
export function manyJumps(values: number[]): number {
  let total = 0

  for (const value of values) {
    if (value < 0) {
      break
    }

    if (value === 0) {
      continue
    }

    total += value
  }

  return total
}

/**
 * Updates a variable that is not the one tested by the loop condition.
 * @param limit the iteration limit
 * @returns the running total
 */
export function misplacedCounter(limit: number): number {
  let total = 0

  for (let i = 0; i < limit; total++) {
    total += i
  }

  return total
}

/**
 * Mutates the loop counter inside the loop body.
 * @param limit the iteration limit
 * @returns the running total
 */
export function updatedCounter(limit: number): number {
  let total = 0

  for (let i = 0; i < limit; i++) {
    i = i + 2
    total += i
  }

  return total
}
