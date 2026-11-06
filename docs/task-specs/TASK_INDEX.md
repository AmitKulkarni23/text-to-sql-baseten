# Task Index

Work through the tasks in order. Pick the first task that is not struck through and whose dependencies are struck through, and follow its scope and acceptance criteria. When every criterion is met, strike the line through (`~~...~~`) in the same commit as the task's last change. Steps marked **asks the user** are hard stops.

Cost estimates are ranges from list prices and are unverified until the smoke run measures real minutes. Update them here after TASK-004.

---

### ~~TASK-001: Scaffold and CI · depends on: none · $0~~

Root `package.json` (Bun 1.4.2, React, MUI, Prettier, ESLint hooks plugin, TypeScript, happy-dom, Testing Library: the same versions as DiscordRelay), `tsconfig.json`, `eslint.config.js`, `bunfig.toml` with a coverage floor, `.env.example`, `.github/workflows/ci.yml` and `.github/dependabot.yml` modeled on DiscordRelay.

- [x] `bun install`, `format:check`, `lint`, `typecheck` and `bun test` pass on an empty project.
- [x] CI runs all of them on push and PR.
- [x] Repo pushed to GitHub (**asks the user** for the repo name and visibility).

### ~~TASK-002: Eval set and scorer · depends on: 001 · $0~~

Build the fixed held-out set and the scoring logic. Nothing calls a model yet.

- [x] `eval/build-heldout.ts` reads the `test` split of `gretelai/synthetic_text_to_sql` at a pinned revision (parquet download; the rows API rate-limits), keeps the examples whose `sql_context` and gold `sql` run in `bun:sqlite`, and writes 300 of them (fixed seed) to `eval/data/heldout.jsonl` with their `sql_complexity` and `domain`.
- [x] `eval/score.ts`: execution match. It runs gold and predicted SQL on a fresh in-memory DB built from the context and compares result sets as multisets (order-insensitive unless the gold has `ORDER BY`). Invalid SQL counts as a miss and records the error.
- [x] Tests cover row order, duplicates, NULLs, int vs float, and invalid SQL.

### ~~TASK-003: Prompt and frontier baseline · depends on: 002 · ~$0.50 of Model APIs credits~~

- [x] `backend/prompt.ts` with `PROMPT_VERSION`: system prompt ("Return only one SQLite query"), schema, question. SQL is extracted from the reply (strip code fences).
- [x] `eval/run.ts --model <slug> --base-url <url> --limit N` calls any OpenAI-compatible endpoint with concurrency 8 and writes `eval/results/<model>-<date>.json` (accuracy overall and by complexity, P50/P90 latency, tokens).
- [x] **Asks the user**, then runs the 300-example set against one large Model APIs model. This is the "frontier" number to beat. Logged in `docs/cost-log.md`.

Result: DeepSeek-V4.1-Flash 67.0% (P50 952 ms, P90 1899 ms), $0.09. Schema only (CREATE statements) goes in the prompt; rows never do.

### ~~TASK-004: Training config and smoke run · depends on: 003 · ~$1 to $2~~

- [x] `training/config.py`, `run.sh`, `train.py` from the Baseten getting-started recipe: `Qwen/Qwen2.5-Coder-1.5B-Instruct`, TRL SFT, LoRA r=16 on all-linear, bf16, loss on completions only, prompts built exactly like `prompt.ts`, `HF_TOKEN` from the `hf_access_token` secret, checkpoints to `$BT_CHECKPOINT_DIR`, pinned dataset revision, no eval-set overlap.
- [x] **Asks the user**: confirm the `hf_access_token` secret exists in Baseten, and that Training is covered by the credits (billing page).
- [x] **Asks the user**, then `SMOKE=1` push on 1x H100. Amit has **no Training credits and no payment method**: if Baseten rejects the job or asks for payment, stop (don't add one) and switch to TASK-004B.
- [x] On success: Tail logs and stop the job on any failure. Record the real minutes and $, and the steps per second, then update the full-run estimate below.

### ~~TASK-004B: Plan B, train on the Mac with MLX · only if TASK-004 is blocked · $0 training~~

Same model, data, prompt and seed as Plan A, run locally on the M5 (32 GB).

- [x] `training/mlx/`: export the train split to MLX's chat JSONL format with the same prompt as `prompt.ts`; run `mlx_lm.lora` (LoRA, same rank, `--iters` capped) via `uvx --from mlx-lm`; smoke run of 50 iterations first.
- [x] Fuse the adapter into the base model (`mlx_lm.fuse`, full precision) and check it loads with `transformers` before uploading.
- [x] **Asks the user**, then upload to a **private** Hugging Face repo (read with the `hf_access_token` secret).
- [x] TASK-006 then deploys that repo with a Truss/Engine-Builder `config.yaml` (`checkpoint_repository: source: HF`) instead of `deploy_checkpoints.py`, and skips TASK-005.

### ~~TASK-005: Full training run · depends on: 004 · ~$2 to $5 (estimate; refine after the smoke run)~~

- [x] About 20k training examples, 1 epoch, `max_steps` set from the smoke run's throughput, checkpoints every ~25% of steps.
- [x] **Asks the user** with the refined estimate, then push. Loss curve noted in the README.

### ~~TASK-006: Deploy and evaluate · depends on: 005 · ~$2 to $6~~

- [x] `training/deploy_checkpoints.py`: base model, LoRA rank 16, the cheapest GPU the deploy accepts (try L4 or A10G; fall back to H100). Check with `--dry-run --config-out-dir ./generated` first (free).
- [x] **Asks the user**, then deploy with `min_replica 0`, `max_replica 1`, a shorter `scale_down_delay` (e.g. 300 s).
- [x] Run the eval for the fine-tuned checkpoint and the base model (check whether the same vLLM deployment serves the base model by name; unverified).
- [x] README results table: fine-tuned vs base vs frontier on accuracy, P50/P90 latency and $ per 1k queries. If the fine-tune doesn't beat the base model clearly, stop and discuss before building the UI.

### ~~TASK-007: Backend · depends on: 003 · $0 (fake Baseten in tests)~~

- [x] `config.ts`, `log.ts`, `baseten.ts`, `sql.ts`, `handlers.ts`, `dev.ts` and thin `api/*.ts` per `backend.rules.md`. Routes: `GET /api/health`, `GET /api/dbs` (id, name, tables), `POST /api/ask` `{ dbId, question, model: 'tuned' | 'frontier' }` → `{ sql, columns, rows, truncated, latencyMs, model }`.
- [x] Chinook SQLite in `backend/db/` (MIT license noted in README).
- [x] Handler tests use a fake Baseten client. Every SQL-guard rejection is tested.
- [x] Free check first: deploy a preview with one function that opens the bundled Chinook file with `bun:sqlite` on Vercel's Bun runtime. If that fails, use Node's built-in `node:sqlite` (only `sql.ts` changes).
- [x] `vercel.json`: Bun runtime, `maxDuration: 60`, `includeFiles: backend/db/**` for the functions.

### ~~TASK-008: Chat frontend · depends on: 007 · $0~~

- [x] React + MUI: database picker with its tables, chat thread, question box, each answer shows the SQL (copy button), a results table, latency and the model used. Toggle to ask the frontier model the same question side by side.
- [x] Loading, "waking the model up" (cold start), empty, error and rate-limited states.
- [x] `vercel.json`: `bun run build` → `dist/` as the static output.

### TASK-009: Ship · depends on: 006, 008 · Vercel free tier; Baseten only while in use

- [ ] **Asks the user**, then set env vars with `vercel env add` and run `vercel deploy --prod`.
- [ ] Smoke test the live site with Amit. Confirm the deployment scales back to zero afterwards.

### TASK-010: README as the FDE write-up · depends on: 009 · $0

- [ ] Problem framing, eval method, results table, cost actually spent (from `docs/cost-log.md`), latency, what I'd do next for a real customer (3B model, Engine-Builder/TensorRT-LLM, FP8, speculative decoding, schema-aware retrieval for large databases, a feedback loop from the logs).

## Outcome (2026-11-06)

Plan A training was refused (403). TASK-004B ran instead (local MPS, same train.py), and TASK-006 serves the adapter with the vLLM Truss in `serving/`. Final: fine-tuned 63.3% vs base 52.3% vs frontier 67.0% (n=300). TASK-009 is open: promoting deployment `woo6r7n` to production and `vercel deploy --prod` need Amit's approval. TASK-010: the README is written; update it after shipping.
