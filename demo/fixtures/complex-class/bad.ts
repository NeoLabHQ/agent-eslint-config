// Targets: unicorn/no-static-only-class, no-restricted-syntax (static members),
// ts/class-methods-use-this, unicorn/prefer-class-fields,
// unicorn/custom-error-definition

/**
 * A class that holds only static members.
 */
export class StaticBox {
  static seed = 1

  /**
   * Reads the static seed.
   * @returns the seed
   */
  static read(): number {
    return StaticBox.seed
  }
}

/**
 * An instance method that never uses `this`.
 */
export class Calculator {
  /**
   * Doubles the given value.
   * @param value the input
   * @returns the doubled value
   */
  compute(value: number): number {
    return value * 2
  }
}

/**
 * Assigns a field in the constructor instead of declaring a class field.
 */
export class Holder {
  value: number

  /**
   * Initialises the holder.
   */
  constructor() {
    this.value = 5
  }
}

/**
 * A custom Error subclass that omits the conventional `name` assignment.
 */
export class ValidationError extends Error {
  /**
   * Builds the error from a field name.
   * @param field the offending field
   */
  constructor(field: string) {
    super(field)
  }
}
