// Clean: bundle parameters into an object, flatten nesting, keep boolean logic
// simple, iterate without deep callbacks, and keep functions short.

/** The four inputs, bundled to keep the parameter count at one. */
interface Quad { one: number, two: number, three: number, four: number }

/**
 * Takes a single object parameter instead of four positional ones.
 * @param values the four inputs
 * @returns the sum
 */
export function tooManyParams(values: Quad): number {
  return values.one + values.two + values.three + values.four
}

/**
 * Flattens the nested conditions into a single guard.
 * @param value the input
 * @returns a code
 */
export function deepNesting(value: number): number {
  if (value > 2) {
    return 3
  }

  return 0
}

/**
 * Uses a simple range check instead of a long boolean chain.
 * @param value the input
 * @returns whether the value is in range
 */
export function highComplexity(value: number): boolean {
  return value >= 1 && value <= 12
}

/**
 * Flattens the grid once and iterates without nested callbacks.
 * @param grid the nested arrays
 */
export function nestedCallbacks(grid: number[][][][]): void {
  for (const cell of grid.flat(3)) {
    console.error(cell)
  }
}

/**
 * Accumulates the same total with a short loop.
 * @returns the accumulated total
 */
export function bigRoutine(): number {
  let acc = 0

  for (let i = 1; i <= 42; i++) {
    acc += i
  }

  return acc
}
