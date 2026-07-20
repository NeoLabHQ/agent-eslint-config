// Targets: max-params, max-depth, sonarjs/cognitive-complexity, complexity,
// max-lines-per-function, max-statements, max-nested-callbacks
// (deepNesting also co-fires sonarjs/nested-control-flow + unicorn/no-lonely-if;
// nestedCallbacks co-fires sonarjs/no-nested-functions; bigRoutine co-fires
// max-statements together with max-lines-per-function.)

/**
 * Takes more than three parameters.
 * @param one first
 * @param two second
 * @param three third
 * @param four fourth
 * @returns the sum
 */
export function tooManyParams(one: number, two: number, three: number, four: number): number {
  return one + two + three + four
}

/**
 * Nests control flow beyond the allowed depth, inflating cognitive complexity.
 * @param value the input
 * @returns a code
 */
export function deepNesting(value: number): number {
  if (value > 0) {
    if (value > 1) {
      if (value > 2) {
        return 3
      }
    }
  }

  return 0
}

/**
 * Raises cyclomatic complexity past the limit with a long boolean chain.
 * @param value the input
 * @returns whether the value is in range
 */
export function highComplexity(value: number): boolean {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
    || value === 6 || value === 7 || value === 8 || value === 9 || value === 10
    || value === 11 || value === 12
}

/**
 * Nests callbacks more than three levels deep.
 * @param grid the nested arrays
 */
export function nestedCallbacks(grid: number[][][][]): void {
  grid.forEach((cube) => {
    cube.forEach((plane) => {
      plane.forEach((line) => {
        line.forEach((cell) => {
          console.error(cell)
        })
      })
    })
  })
}

/**
 * Runs well past the per-function line and statement limits.
 * @returns the accumulated total
 */
export function bigRoutine(): number {
  let acc = 0
  acc += 1
  acc += 2
  acc += 3
  acc += 4
  acc += 5
  acc += 6
  acc += 7
  acc += 8
  acc += 9
  acc += 10
  acc += 11
  acc += 12
  acc += 13
  acc += 14
  acc += 15
  acc += 16
  acc += 17
  acc += 18
  acc += 19
  acc += 20
  acc += 21
  acc += 22
  acc += 23
  acc += 24
  acc += 25
  acc += 26
  acc += 27
  acc += 28
  acc += 29
  acc += 30
  acc += 31
  acc += 32
  acc += 33
  acc += 34
  acc += 35
  acc += 36
  acc += 37
  acc += 38
  acc += 39
  acc += 40
  acc += 41
  acc += 42

  return acc
}
