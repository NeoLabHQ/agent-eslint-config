// Clean: await promises instead of chaining, let the catch binding stay
// `unknown`, await floating calls, drop `async` when nothing is awaited, await
// before using a promise as a condition, and only await real thenables.

/**
 * Awaits the task instead of chaining `.then()`.
 * @param task the async task
 * @returns the incremented result
 */
export async function thenChain(task: () => Promise<number>): Promise<number> {
  const value = await task()

  return value + 1
}

/**
 * Awaits inside try/catch so the caught binding stays `unknown`.
 * @param task the async task
 * @returns nothing
 */
export async function catchTyped(task: () => Promise<void>): Promise<void> {
  try {
    await task()
  }
  catch (error) {
    console.error(error)
  }
}

/**
 * Awaits the async task.
 * @param task the async task
 * @returns nothing
 */
export async function floating(task: () => Promise<void>): Promise<void> {
  await task()
}

/**
 * Drops `async` because nothing is awaited.
 * @returns a constant
 */
export function noAwait(): number {
  return 1
}

/**
 * Awaits the async task in a loop instead of passing an async callback.
 * @param task the async task
 * @returns nothing
 */
export async function misused(task: () => Promise<void>): Promise<void> {
  const numbers = [1, 2, 3]

  for (const value of numbers) {
    await task()
    console.error(value)
  }
}

/**
 * Awaits a real thenable.
 * @param task the async task
 * @returns the awaited number
 */
export async function awaitNonThenable(task: () => Promise<number>): Promise<number> {
  return await task()
}
