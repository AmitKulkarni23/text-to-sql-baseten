---
paths:
  - "backend/**/*.ts"
  - "api/**/*.ts"
---

# Backend Rules

## Boundaries

- Only `backend/dev.ts` MUST call `Bun.serve`, and it is for local development only. Production runs the same handlers as Vercel Functions in `api/`, which MUST stay thin: parse nothing, just call a handler from `backend/handlers.ts`. Only `backend/baseten.ts` MUST call Baseten or read `BASETEN_API_KEY`. Only `backend/sql.ts` MUST open a database.
- Dependencies MUST be passed as function arguments, wired in `api/*.ts` and `dev.ts`, so tests can pass a fake Baseten client.
- Env vars MUST be read and validated once per process (cold start) in `config.ts`. A missing or invalid value MUST log an error naming the variable and fail the request with 500 `config_error`, never start half-configured.
- Prompts MUST be built only in `prompt.ts`, and MUST produce the same messages as `training/train.py` for the same schema and question. A change to one MUST change the other in the same commit.

## SQL Safety

Generated SQL is untrusted input.

- Databases MUST be opened with `{ readonly: true }`.
- Only a single statement that starts with `SELECT` or `WITH` MUST be executed. Anything else (`;`-separated statements, `PRAGMA`, `ATTACH`, DDL, DML) MUST be rejected with 422 and the SQL shown to the user, not run.
- Results MUST be capped at 200 rows (the query is wrapped in `SELECT * FROM (…) LIMIT 201`). There is no per-query time limit yet; the function's `maxDuration` is the ceiling (`ponytail:` in `sql.ts`).
- `dbId` MUST be checked against the list of files in `backend/db/`. Paths MUST NOT be built from user input.

## Cost Guards

The page is public, so every request can cost money.

- `/api/ask` MUST rate-limit per IP (default 10 per minute) and enforce `DAILY_MODEL_CALLS`. Both are in memory per function instance and MUST return 429 with a plain message. The client IP comes from `x-forwarded-for` (set by Vercel).
- Questions MUST be capped at 500 characters, and `max_tokens` on every Baseten call MUST be at most 512.
- Baseten calls MUST time out before the function's `maxDuration` in `vercel.json` (Baseten call 55 s, function 60 s) and MUST NOT be retried automatically.
- When the deployment is cold (scaled to zero), the response SHOULD say so, so the UI can show "waking the model up" rather than a bare spinner.

## Errors

- Users MUST get a stable error code and a plain message (`{ error: { code, message } }`). Baseten URLs, model IDs, keys and stack traces MUST NOT reach the browser.

## Logging

- Logs MUST go through `log.debug|info|warn|error(event, fields)` in `backend/log.ts`: one JSON object per line with `level` and `event`.
- Each `/api/ask` MUST log one line with `model`, `latencyMs`, `promptTokens`, `completionTokens`, `ok` and `errorCode`. This is the monitoring for the model.
- The API key and client IP addresses MUST NOT be logged. Questions MAY be logged truncated to 200 characters.
