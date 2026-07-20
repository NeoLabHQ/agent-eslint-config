// Targets: sonarjs/function-name, sonarjs/class-name, sonarjs/variable-name,
// id-length
// (The sibling file `util-named.bad.ts` covers validate-filename/naming-rules.)

/**
 * Function name embeds the banned word "Helper".
 * @returns a value
 */
export function buildHelper(): number {
  return 1
}

/**
 * Class name embeds the banned word "Util".
 */
export class UtilBox {
  private readonly seed = 1

  /**
   * Returns the seed.
   * @returns the seed
   */
  read(): number {
    return this.seed
  }
}

/**
 * Declares a variable whose name embeds "common" and one that is too short.
 * @returns a value
 */
export function declareBadNames(): number {
  const commonValue = 5
  const ab = 2

  return commonValue + ab
}
