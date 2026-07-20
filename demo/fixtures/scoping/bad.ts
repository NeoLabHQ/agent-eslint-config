// Targets: sonarjs/no-nested-functions, sonarjs/no-function-declaration-in-block,
// sonarjs/no-globals-shadowing, unicorn/consistent-function-scoping

/**
 * Nests function declarations more than four levels deep.
 * @param seed the seed value
 * @returns the computed value
 */
export function deeplyNested(seed: number): number {
  /** @returns level two */
  function levelTwo(): number {
    /** @returns level three */
    function levelThree(): number {
      /** @returns level four */
      function levelFour(): number {
        /** @returns level five */
        function levelFive(): number {
          return seed + 5
        }

        return levelFive()
      }

      return levelFour()
    }

    return levelThree()
  }

  return levelTwo()
}

/**
 * Declares a function inside a block statement.
 * @param flag whether to compute
 * @returns the computed value
 */
export function declInBlock(flag: boolean): number {
  if (flag) {
    /** @returns one */
    function compute(): number {
      return 1
    }

    return compute()
  }

  return 0
}

/**
 * Shadows the global `Math` binding with a local variable.
 * @param value the input value
 * @returns the computed value
 */
export function shadowGlobal(value: number): number {
  const Math = value + 1

  return Math * 2
}

/**
 * Declares an inner function that never touches the outer scope.
 * @param value the input value
 * @returns the doubled value
 */
export function withInnerScope(value: number): number {
  /**
   * Doubles its own argument.
   * @param input the number to double
   * @returns the doubled number
   */
  function double(input: number): number {
    return input * 2
  }

  return double(value)
}
