// Targets: sonarjs/no-all-duplicated-branches, sonarjs/no-duplicated-branches,
// sonarjs/no-dead-store, sonarjs/no-redundant-assignments,
// sonarjs/no-identical-functions, sonarjs/no-useless-increment,
// sonarjs/useless-string-operation, sonarjs/prefer-immediate-return,
// sonarjs/no-unthrown-error

/**
 * Returns the same value from both branches.
 * @param flag the selector
 * @returns a code
 */
export function allDuplicated(flag: boolean): number {
  if (flag) {
    return 1
  }
  else {
    return 1
  }
}

/**
 * Repeats an identical branch in a non-adjacent position.
 * @param value the selector
 * @returns a code
 */
export function duplicatedBranches(value: number): number {
  if (value === 1) {
    console.error('same')

    return 10
  }
  else if (value === 2) {
    return 20
  }
  else {
    console.error('same')

    return 10
  }
}

/**
 * Assigns a local only to return it on the next line.
 * @param value the input
 * @returns the doubled value
 */
export function immediateReturn(value: number): number {
  const doubled = value * 2

  return doubled
}

/**
 * Writes a value that is overwritten before it is ever read.
 * @param value the input
 * @returns the final value
 */
export function deadStore(value: number): number {
  let result = value

  result = value + 1

  return result
}

/**
 * Assigns the same computed value twice in a row.
 * @param value the input
 * @returns the value
 */
export function redundantAssign(value: number): number {
  let result = 5

  console.error(result)

  result = 5

  return result + value
}

/**
 * Increments a value in a statement whose result is discarded.
 * @param value the input
 * @returns the value
 */
export function uselessIncrement(value: number): number {
  let result = value

  result = result++

  return result
}

/**
 * Calls a string method whose result is thrown away.
 * @param text the input
 * @returns the text length
 */
export function uselessStringOp(text: string): number {
  text.trim()

  return text.length
}

/**
 * Creates an Error object but never throws it.
 * @param flag whether to build the error
 */
export function unthrown(flag: boolean): void {
  if (flag) {
    new Error('never thrown')
  }
}

/**
 * First of two byte-identical functions.
 * @param value the input
 * @returns the computed value
 */
export function identicalOne(value: number): number {
  const step = value + 1

  return step * 3
}

/**
 * Second of two byte-identical functions.
 * @param value the input
 * @returns the computed value
 */
export function identicalTwo(value: number): number {
  const step = value + 1

  return step * 3
}
