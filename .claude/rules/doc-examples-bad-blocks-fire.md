---
title: Bad doc examples must actually trip every cited rule
impact: HIGH
---

# Every rule ID annotated on a `// bad` block must actually fire

When a `// bad` code block annotates a specific rule ID as the reason a line is wrong, that rule MUST actually report on that exact snippet under the real linter. Citing a rule by its apparent intent (without empirically linting the block) misleads readers: rules have structural scopes and exemptions (e.g. `unicorn/no-lonely-if` covers `if { if }`, NOT `else { if }`; `ts/only-throw-error` has `allowRethrowing`, so `throw error` on a caught variable is allowed even when narrowed to a string). Verify each annotation by linting the extracted block, not by reasoning about the rule name.

## Incorrect

Annotations assert rules that never fire on this structure — a reader who lints the block sees different errors and loses trust in the docs.

```ts
// bad
function route(kind: string): string {
  if (kind === 'a') { return 'alpha' }
  else {
    if (kind === 'b') { return 'beta' }   // unicorn/no-lonely-if  ← does NOT fire: rule ignores else-blocks
    else if (kind === 'c') { return 'charlie' }
  }
}
// ...and in a catch block:
if (typeof error === 'string') {
  throw error                              // ts/only-throw-error  ← does NOT fire: rethrow of caught var is allowed
}
```

## Correct

Cite only rules confirmed to fire on the snippet; restructure the example so the intended rule truly triggers, or drop the annotation.

```ts
// bad
function check(first: boolean, second: boolean): void {
  if (first) {
    if (second) { doWork() }              // unicorn/no-lonely-if  ← fires: if-nested-in-if
  }
}
// throw a value that is NOT the caught variable to trip only-throw-error:
throw 'boom'                              // ts/only-throw-error   ← fires: throwing a non-Error literal
```
