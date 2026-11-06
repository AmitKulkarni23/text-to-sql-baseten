---
paths:
  - "**/*.test.{ts,tsx}"
---

# Testing Rules

## Runner and location

- Tests MUST use `bun:test`. Vitest and Jest MUST NOT be added.
- Tests MUST live in a `tests/` folder that mirrors the source tree: `backend/sql.ts` is tested by `backend/tests/sql.test.ts`, `frontend/lib/turns.ts` by `frontend/tests/lib/turns.test.ts`, `eval/score.ts` by `eval/tests/score.test.ts`.
- Component and hook tests MUST use React Testing Library with happy-dom, set up per file (no global preload, which would replace `fetch` for backend tests).
- Tests MUST NOT call Baseten, Hugging Face or any network service. Integration tests MUST run the real `Bun.serve` with a fake Baseten client passed in.

## Structure and naming

- Each file MUST have a top-level `describe` named after the unit under test.
- `it` blocks MUST be grouped under nested `describe("when …")` blocks, never directly under the top level.
- Test names MUST use `should <outcome> when <trigger>`.

## Assertions and async

- Every test MUST have at least one specific assertion.
- Tests MUST NOT `sleep` or use fixed `setTimeout` waits. Await the event or use fake timers.
- Test data SHOULD look real (real-looking schemas, questions and SQL from Chinook or the eval set), not `"test"` or `"abc"`.

## What to test

- MUST test: SQL guard (every rejected statement type, multi-statement, comments hiding a second statement), row and time limits, `dbId` validation, rate limit and daily cap, env validation, prompt building, eval scoring (row order, duplicates, NULLs, type differences), the frontend turn reducer.
- MUST NOT test: MUI internals, styling, pure display components.
