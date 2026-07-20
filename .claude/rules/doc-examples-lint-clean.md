---
title: Good doc examples must pass the whole config
impact: HIGH
paths:
  - "**/*.md"
  - "README.md"
---

# Good doc examples must pass the whole config

Every code block labelled `// good` in the docs must satisfy ALL of this package's rules, not just the ones the example is demonstrating. This config requires JSDoc on every function/method/class declaration (`jsdoc/require-jsdoc`), so a `good` block with an undocumented function is misleading — a reader who copies it gets a lint error, undermining the doc's authority.

## Incorrect

A `good` block that demonstrates complexity rules but omits the JSDoc the config mandates on every declaration.

```ts
// good
function grade(input: Grading): string {   // jsdoc/require-jsdoc fires: no JSDoc
  const total = totalScore(input)
  return total >= 90 ? 'A' : 'F'
}
```

## Correct

The same block, also satisfying `jsdoc/require-jsdoc`.

```ts
// good
/**
 * Grades an input.
 * @param input The grading input.
 * @returns The letter grade.
 */
function grade(input: Grading): string {
  const total = totalScore(input)
  return total >= 90 ? 'A' : 'F'
}
```
