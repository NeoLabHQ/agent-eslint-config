// Clean: flatten nesting into a single guard, close every else-if chain with an
// else, avoid nested ternaries, break each switch case, and start each
// conditional on its own line.

/**
 * Combines the flags into a single flat condition.
 * @param first first flag
 * @param second second flag
 * @param third third flag
 * @returns a code
 */
export function deepNest(first: boolean, second: boolean, third: boolean): number {
  if (first && second && third) {
    return 3
  }

  return 0
}

/**
 * Closes the else-if chain with a final else branch.
 * @param value the input
 * @returns a code
 */
export function noFinalElse(value: number): number {
  if (value === 1) {
    return 1
  }
  else if (value === 2) {
    return 2
  }
  else {
    return 0
  }
}

/**
 * Uses at most a single, un-nested ternary.
 * @param first first flag
 * @param second second flag
 * @returns a code
 */
export function nestedTernary(first: boolean, second: boolean): number {
  if (first) {
    return second ? 1 : 2
  }

  return 3
}

/**
 * Breaks out of every switch case so none fall through.
 * @param value the input
 */
export function fallThrough(value: number): void {
  switch (value) {
    case 1:
      console.error('one')
      break
    case 2:
      console.error('two')
      break
    default:
      console.error('other')
  }
}

/**
 * Starts each conditional on its own line.
 * @param left first flag
 * @param right second flag
 * @returns a code
 */
export function sameLine(left: boolean, right: boolean): number {
  if (left) {
    return 1
  }

  if (right) {
    return 2
  }

  return 0
}
