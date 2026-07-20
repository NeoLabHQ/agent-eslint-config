// Clean: the caller `runSteps` appears before the callee `firstStep`, so the
// definitions read top-to-bottom in call order.

/**
 * Runs the steps in order.
 * @returns the combined value
 */
function runSteps(): number {
  return firstStep()
}

/**
 * Produces the first step's value.
 * @returns the first value
 */
function firstStep(): number {
  return 1
}

export const total = runSteps()
