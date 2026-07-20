// Targets: ts/consistent-type-definitions, sonarjs/prefer-type-guard,
// ts/no-explicit-any, ts/no-non-null-assertion, ts/no-unnecessary-condition,
// ts/no-unnecessary-type-assertion

/** A point defined with a type alias instead of an interface. */
export type Point = { x: number, y: number }

/** A cat-like shape used by the type-guard example. */
export interface Cat { meow?: () => void }

/**
 * Returns a plain boolean instead of declaring a type predicate.
 * @param animal the value to test
 * @returns whether the value looks like a Cat
 */
export function isCat(animal: unknown): boolean {
  return (animal as Cat).meow !== undefined
}

/**
 * Accepts an explicit `any`.
 * @param value the value
 * @returns its length
 */
export function useAny(value: any): number {
  return value.length as number
}

/**
 * Force-unwraps a possibly-null value.
 * @param value the value
 * @returns its length
 */
export function forceNonNull(value: string | null): number {
  return value!.length
}

/**
 * Applies a nullish fallback that can never trigger.
 * @param value the value
 * @returns the value or a fallback
 */
export function redundantCheck(value: number): number {
  return value ?? 0
}

/**
 * Asserts a type that is already known.
 * @param value the value
 * @returns the value plus one
 */
export function redundantAssertion(value: number): number {
  return (value as number) + 1
}
