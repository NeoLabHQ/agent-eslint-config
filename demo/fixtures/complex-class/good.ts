// Clean: use instance members instead of static-only classes, make methods use
// `this`, declare class fields directly, and give custom errors a proper name.

/**
 * A class with instance state instead of only static members.
 */
export class StaticBox {
  readonly seed = 1

  /**
   * Reads the seed.
   * @returns the seed
   */
  read(): number {
    return this.seed
  }
}

/**
 * An instance method that uses `this`.
 */
export class Calculator {
  private readonly factor = 2

  /**
   * Doubles the given value.
   * @param value the input
   * @returns the doubled value
   */
  compute(value: number): number {
    return value * this.factor
  }
}

/**
 * Declares its field directly rather than assigning it in a constructor.
 */
export class Holder {
  value = 5

  /**
   * Returns the held value.
   * @returns the value
   */
  read(): number {
    return this.value
  }
}

/**
 * A custom Error subclass that assigns the conventional `name`.
 */
export class ValidationError extends Error {
  /**
   * Builds the error from a field name.
   * @param field the offending field
   * @param options the standard error options
   */
  constructor(field: string, options?: ErrorOptions) {
    super(field, options)
    this.name = 'ValidationError'
  }
}
