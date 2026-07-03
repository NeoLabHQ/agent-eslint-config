---
title: Rewrite Example Config as ESLint Package
---

## Initial User Prompt

rewrite example config as eslint package

### Context

This project was initially setup, it not yet published:
- index.ts and test for it just dummy files, that should be rewritten
- src/eslint.*.mjs/cjs files was copy pasted from our company internal project. It should be used as basis for this package

### Goal

Create eslint package, simular to `@antfu/eslint-config`, so it can be use like this:

```js
// eslint.config.mjs
import config from 'agent-eslint-config'

export default config()
```

And provide all rules/plugins/settings that are currently provided by our eslint config.

### Requirements

- Config should be as extendable as antfu, better even use same types, so it can be drop in replacement for antfu config
- parts that obviusly should be configured at project level, should be kept configurable at project level, for example: `ignores: [...]`. It shouldn't be inside of config.
- Inside of config should be used antfu directly, together with sonar and unicorn
- all files in src/ should be in typescript
- test as much as possible, using vitest
- update readme with usage instructions, rules that covered and what can be configured 

## Description

// Will be filled in future stages by business analyst
