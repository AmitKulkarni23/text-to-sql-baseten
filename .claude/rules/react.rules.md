---
paths:
  - "frontend/**/*.{ts,tsx}"
---

# React + MUI Rules

Rule names in parentheses are from Vercel's react-best-practices. Next.js, server-rendering and SWR rules from that guide MUST NOT be applied: this is a single client-rendered page.

## State

- The chat thread MUST be one array of turns `{ id, question, status, result | error }`, updated with the functional form `setTurns(prev => …)` (`rerender-functional-setstate`).
- The thread MUST hold at most 50 turns; the oldest are removed.
- A request in flight MUST be cancellable with `AbortController`, and aborted on unmount.
- Derived values MUST be computed during render, not in an effect (`rerender-derived-state-no-effect`).
- Pure logic (turn reducer, result formatting) SHOULD live in `frontend/lib/` so it can be unit-tested without React. Effects SHOULD live in hooks in `frontend/hooks/`.
- The frontend MUST call only same-origin `/api/*`. It MUST NOT know any Baseten URL or key.

## Components

- Components MUST NOT be defined inside other components (`rerender-no-inline-components`).
- Each turn's row SHOULD be wrapped in `memo` (`rerender-memo`).
- Conditionals MUST use a ternary, not `&&`, when the left side can be a number (`rendering-conditional-render`).
- Every request MUST have visible loading, cold-start, empty-result, error and rate-limited states.

## Security

- SQL, cell values and model output MUST be rendered as React text. `dangerouslySetInnerHTML` MUST NOT be used.

## MUI

- Styling MUST use MUI components with `sx` props. CSS files, CSS Modules and Tailwind MUST NOT be used.
- Colors and sizes shared across components MUST come from `frontend/theme.ts`. Hex values MUST NOT appear in components.
- MUI MUST be imported per component (`@mui/material/Button`), not from the `@mui/material` barrel (`bundle-barrel-imports`).
- MUI components MUST be preferred over hand-built ones (e.g. `Table` for results).
