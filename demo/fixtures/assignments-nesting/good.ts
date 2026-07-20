// Clean: extract assignments into their own statements, increment separately,
// leave parameters untouched, destructure once, and reuse the destructured
// bindings instead of re-reading via member access.

interface Point { x: number, y: number }

/**
 * Assigns in its own statement before returning.
 * @param base the starting value
 * @returns the combined value
 */
export function nestedAssignment(base: number): number {
  const total = base + 5

  return total + 1
}

/**
 * Increments the index in its own statement.
 * @param values the values to read
 * @returns the selected value
 */
export function nestedIncDec(values: number[]): number {
  let index = 0

  index += 1

  return values[index] ?? 0
}

/**
 * Derives the result without reassigning the parameter.
 * @param count the starting count
 * @returns the incremented count
 */
export function reassignParam(count: number): number {
  return count + 1
}

/**
 * Destructures the pair directly.
 * @param pair the pair to read
 * @returns the sum of the pair
 */
export function noDestructuring(pair: readonly [number, number]): number {
  const [first, second] = pair

  return first + second
}

/**
 * Reuses the destructured bindings consistently.
 * @param point the point to read
 * @returns the sum of the coordinates
 */
export function inconsistentDestructure(point: Point): number {
  const { x, y } = point

  return x + y + x
}
