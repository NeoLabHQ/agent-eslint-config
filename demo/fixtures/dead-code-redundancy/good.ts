// Clean: give each branch a distinct body, return expressions directly, drop
// dead and redundant writes, use the result of every operation, throw the
// Errors you build, and keep sibling functions non-identical.

/**
 * Returns a distinct value per branch.
 * @param flag the selector
 * @returns a code
 */
export function allDuplicated(flag: boolean): number {
  if (flag) {
    return 1
  }

  return 2
}

/**
 * Gives every branch a distinct body.
 * @param value the selector
 * @returns a code
 */
export function duplicatedBranches(value: number): number {
  if (value === 1) {
    console.error('one')

    return 10
  }
  else if (value === 2) {
    return 20
  }
  else {
    console.error('other')

    return 30
  }
}

/**
 * Returns the computed expression directly.
 * @param value the input
 * @returns the doubled value
 */
export function immediateReturn(value: number): number {
  return value * 2
}

/**
 * Computes the result once, with no overwritten write.
 * @param value the input
 * @returns the final value
 */
export function deadStore(value: number): number {
  return value + 1
}

/**
 * Assigns the literal once and reads it.
 * @param value the input
 * @returns the value
 */
export function redundantAssign(value: number): number {
  const result = 5

  console.error(result)

  return result + value
}

/**
 * Increments and then reads the incremented value.
 * @param value the input
 * @returns the value
 */
export function uselessIncrement(value: number): number {
  let result = value

  result += 1

  return result
}

/**
 * Uses the result of the string operation.
 * @param text the input
 * @returns the trimmed length
 */
export function uselessStringOp(text: string): number {
  return text.trim().length
}

/**
 * Throws the Error it builds.
 * @param flag whether to throw
 */
export function unthrown(flag: boolean): void {
  if (flag) {
    throw new Error('thrown now')
  }
}

/**
 * First function with its own body.
 * @param value the input
 * @returns the computed value
 */
export function identicalOne(value: number): number {
  const step = value + 1

  return step * 3
}

/**
 * Second function with a different body.
 * @param value the input
 * @returns the computed value
 */
export function identicalTwo(value: number): number {
  const step = value + 2

  return step * 4
}
