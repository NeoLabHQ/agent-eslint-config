// Clean counterparts: throw real Errors, keep catch blocks meaningful, preserve
// the caught cause, name the binding `error`, omit unused bindings, and await
// promises guarded by try/catch.

/**
 * Throws a real Error object.
 * @param flag whether to throw
 */
export function throwRaw(flag: boolean): void {
  if (flag) {
    throw new Error('boom')
  }
}

/**
 * Logs the failure before rethrowing, so the catch is not useless.
 * @param task the task to run
 */
export function uselessCatch(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    console.error(error)

    throw error
  }
}

/**
 * Chains the original error as the cause of the wrapper.
 * @param task the task to run
 */
export function dropCause(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    throw new Error('wrapped', { cause: error })
  }
}

/**
 * Names the caught variable `error` as required.
 * @param task the task to run
 */
export function wrongName(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    console.error(error)
  }
}

/**
 * Omits the catch binding because it is not needed.
 * @param task the task to run
 */
export function unusedBinding(task: () => void): void {
  try {
    task()
  }
  catch {
    task()
  }
}

/**
 * Awaits the async task so the try/catch can observe a rejection.
 * @param task the async task
 */
export async function guardWithoutAwait(task: () => Promise<void>): Promise<void> {
  try {
    await task()
  }
  catch (error) {
    console.error(error)
  }
}
