// Fixture that deliberately violates the three custom rules this package adds.
// Each block is annotated with the exact rule ID it is expected to trigger.
// (It also trips other opinionated rules — e.g. missing JSDoc — which is fine:
// the E2E assertions only require that each custom rule ID appears at least once
// and that `good.ts` stays completely clean.)

// alias/prefer-alias — a relative import that reaches into the source dir
// (`../src/thing` → `src/thing`) must use the `@/thing` alias instead.
import { computeThing } from '../src/thing'

// no-never-return/no-never-return-type — a function whose return type is `never`
// should throw at the call site instead of wrapping the throw.
function fail(reason: string): never {
  throw new Error(reason)
}

// step-down-rule/step-down — `first` is defined ABOVE its caller `run`, so the
// call in `run` violates top-down (callers-before-callees) ordering.
function first(): number {
  return computeThing()
}

function run(): number {
  return first()
}

run()
fail('unreachable')
