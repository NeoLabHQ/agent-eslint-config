// Targets: ts/only-throw-error, sonarjs/no-useless-catch,
// sonarjs/no-try-promise, preserve-caught-error, unicorn/catch-error-name,
// unicorn/prefer-optional-catch-binding

/**
 * Throws a raw string literal rather than an Error object.
 * @param flag whether to throw
 */
export function throwRaw(flag: boolean): void {
  if (flag) {
    throw 'boom'
  }
}

/**
 * Wraps a call in a catch that does nothing but rethrow.
 * @param task the task to run
 */
export function uselessCatch(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    throw error
  }
}

/**
 * Discards the original error instead of chaining it as the cause.
 * @param task the task to run
 */
export function dropCause(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Names the caught variable `err` instead of the required `error`.
 * @param task the task to run
 */
export function wrongName(task: () => void): void {
  try {
    task()
  }
  catch (err) {
    console.error(err)
  }
}

/**
 * Binds the caught error even though it is never used.
 * @param task the task to run
 */
export function unusedBinding(task: () => void): void {
  try {
    task()
  }
  catch (error) {
    task()
  }
}

/**
 * Guards an un-awaited promise inside try/catch, which cannot catch rejection.
 * @param task the async task
 */
export function guardWithoutAwait(task: () => Promise<void>): void {
  try {
    void task()
  }
  catch (error) {
    console.error(error)
  }
}
