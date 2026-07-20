// Target: step-down-rule/step-down
// The callee `firstStep` is defined ABOVE its caller `runSteps`, violating the
// top-down ordering (callers must appear before the callees they invoke).

/**
 * Produces the first step's value.
 * @returns the first value
 */
function firstStep(): number {
  return 1
}

/**
 * Runs the steps in order.
 * @returns the combined value
 */
function runSteps(): number {
  return firstStep()
}

export const total = runSteps()
