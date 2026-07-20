// Targets: sonarjs/nested-control-flow, max-depth, unicorn/no-lonely-if,
// sonarjs/elseif-without-else, sonarjs/no-nested-conditional,
// unicorn/no-nested-ternary, sonarjs/no-fallthrough,
// sonarjs/no-same-line-conditional

/**
 * Nests conditionals three levels deep, where each inner `if` is the only
 * statement of its parent block.
 * @param first first flag
 * @param second second flag
 * @param third third flag
 * @returns a code
 */
export function deepNest(first: boolean, second: boolean, third: boolean): number {
  if (first) {
    if (second) {
      if (third) {
        return 3
      }
    }
  }

  return 0
}

/**
 * Ends an else-if chain without a final else branch.
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

  return 0
}

/**
 * Nests a ternary inside another ternary without parentheses.
 * @param first first flag
 * @param second second flag
 * @returns a code
 */
export function nestedTernary(first: boolean, second: boolean): number {
  return first ? second ? 1 : 2 : 3
}

/**
 * Lets a non-empty switch case fall through to the next one.
 * @param value the input
 */
export function fallThrough(value: number): void {
  switch (value) {
    case 1:
      console.error('one')
    case 2:
      console.error('two')
      break
    default:
      console.error('other')
  }
}

/**
 * Starts a second conditional on the same line as the first's closing brace.
 * @param left first flag
 * @param right second flag
 * @returns a code
 */
export function sameLine(left: boolean, right: boolean): number {
  if (left) {
    return 1
  } if (right) {
    return 2
  }

  return 0
}
