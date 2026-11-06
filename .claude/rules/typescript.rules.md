---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript Rules

- `strict` mode MUST be on. `any` MUST NOT be used.
- Data from outside the process (Baseten responses, env vars, request bodies, eval data) MUST be typed `unknown` and narrowed before use.
- Non-null assertions (`!`) MUST NOT be used. Narrow with a check instead.
- Exported functions MUST have explicit return types.
- Request and response shapes MUST be defined once in `backend/types.ts` and imported by both backend and frontend. They MUST NOT be redefined.
- Types SHOULD be `type` aliases; `interface` MAY be used only when declaration merging is needed.
- Code MUST NOT add an interface, class or factory with a single implementation.
- 2-space indentation.

```ts
// Bad
const modelId = process.env.BASETEN_MODEL_ID!

// Good
const modelId = process.env.BASETEN_MODEL_ID
if (!modelId) throw new Error('BASETEN_MODEL_ID is required')
```
