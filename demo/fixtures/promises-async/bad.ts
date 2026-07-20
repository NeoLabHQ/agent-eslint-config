// Targets: promise/prefer-await-to-then,
// ts/use-unknown-in-catch-callback-variable, ts/no-floating-promises,
// ts/require-await, ts/no-misused-promises, ts/await-thenable

/**
 * Chains `.then()` instead of awaiting.
 * @param task the async task
 * @returns the incremented result
 */
export function thenChain(task: () => Promise<number>): Promise<number> {
  return task().then(value => value + 1)
}

/**
 * Types the `.catch()` callback parameter as `Error` instead of `unknown`.
 * @param task the async task
 * @returns nothing
 */
export function catchTyped(task: () => Promise<void>): Promise<void> {
  return task().catch((error: Error) => {
    console.error(error)
  })
}

/**
 * Calls an async task without awaiting or handling the promise.
 * @param task the async task
 */
export function floating(task: () => Promise<void>): void {
  task()
}

/**
 * Declares `async` but never awaits anything.
 * @returns a constant
 */
export async function noAwait(): Promise<number> {
  return 1
}

/**
 * Passes an async callback where a void-returning callback is expected.
 * @param task the async task
 */
export function misused(task: () => Promise<void>): void {
  const numbers = [1, 2, 3]

  numbers.forEach(async () => {
    await task()
  })
}

/**
 * Awaits a value that is not thenable.
 * @returns the awaited number
 */
export async function awaitNonThenable(): Promise<number> {
  const value = await 5

  return value
}
