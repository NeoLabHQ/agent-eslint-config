// Targets: sonarjs/no-nested-assignment, sonarjs/no-nested-incdec,
// sonarjs/no-parameter-reassignment, sonarjs/destructuring-assignment-syntax,
// unicorn/consistent-destructuring

interface Point { x: number, y: number }

/**
 * Buries an assignment inside a larger expression.
 * @param base the starting value
 * @returns the combined value
 */
export function nestedAssignment(base: number): number {
  let total = base

  console.error(total)

  return (total = base + 5) + 1
}

/**
 * Nests an increment inside a member-access expression.
 * @param values the values to read
 * @returns the first value
 */
export function nestedIncDec(values: number[]): number {
  let index = 0

  return values[index++] ?? 0
}

/**
 * Reassigns one of its own parameters with an unrelated value.
 * @param count the starting count
 * @returns the replacement value
 */
export function reassignParam(count: number): number {
  count = 42

  return count
}

/**
 * Reads array elements by index instead of destructuring them.
 * @param pair the pair to read
 * @returns the sum of the pair
 */
export function noDestructuring(pair: readonly [number, number]): number {
  const first = pair[0]
  const second = pair[1]

  return first + second
}

/**
 * Destructures both fields but still reaches for one via member access.
 * @param point the point to read
 * @returns the sum of the coordinates
 */
export function inconsistentDestructure(point: Point): number {
  const { x, y } = point

  return x + y + point.x
}
