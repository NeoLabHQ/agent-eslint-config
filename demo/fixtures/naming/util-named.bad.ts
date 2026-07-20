// Target: validate-filename/naming-rules
// This file's NAME contains the banned word "util", which the filename rule
// forbids for `**/*.ts`. Its contents are otherwise fully lint-clean, so the
// only problem reported here is the filename violation itself.

/**
 * Returns a constant. The violation demonstrated by this file is its name, not
 * its contents.
 * @returns a value
 */
export function readValue(): number {
  return 1
}
