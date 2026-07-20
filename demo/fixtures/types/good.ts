// Clean: define object shapes with `interface`, declare a real type predicate,
// avoid `any`, guard nullable values, and drop redundant checks and assertions.

/** A point defined with an interface. */
export interface Point { x: number, y: number }

/** A cat-like shape used by the type-guard example. */
export interface Cat { meow?: () => void }

/**
 * Narrows the value to a Cat with a proper type predicate.
 * @param animal the value to test
 * @returns whether the value looks like a Cat
 */
export function isCat(animal: unknown): animal is Cat {
  return (animal as Cat).meow !== undefined
}

/**
 * Accepts a concrete type instead of `any`.
 * @param value the value
 * @returns its length
 */
export function useAny(value: string): number {
  return value.length
}

/**
 * Guards the nullable value instead of force-unwrapping it.
 * @param value the value
 * @returns its length
 */
export function forceNonNull(value: string | null): number {
  if (value === null) {
    return 0
  }

  return value.length
}

/**
 * Returns the non-nullable value directly.
 * @param value the value
 * @returns the value
 */
export function redundantCheck(value: number): number {
  return value
}

/**
 * Returns the value without a redundant assertion.
 * @param value the value
 * @returns the value plus one
 */
export function redundantAssertion(value: number): number {
  return value + 1
}
