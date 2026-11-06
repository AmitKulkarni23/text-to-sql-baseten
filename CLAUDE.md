# TextToSQL

A chat interface where you pick a database, ask a question in plain English and get back the SQL query and its results. The model is a small open model (Qwen2.5-Coder-1.5B-Instruct) fine-tuned with LoRA on Baseten Training and served on Baseten. It is compared against its own base model and a large model from Baseten Model APIs.

Built as the demo project for Amit's Forward Deployed Engineer interview at Baseten (context: `../CLAUDE.md`). It acts out the claim in *Inference Engineering* §1.3.2 (book p.33): "for an application that only needs to generate SQL queries from natural language prompts, a tiny fine-tuned model of just a few billion parameters can reach equivalent performance on this specific task." The project's job is to **measure** that claim, not assume it. It follows the FDE loop: frame the problem, evaluate, train, deploy, monitor.

## Cost Rules (read first)

Baseten bills Amit's account by the minute. These are hard stops:

- **Standing approval (2026-11-05):** Amit pre-approved running the whole plan without asking, within his free credits. Retry a failing step up to 3 times, then stop and ask. The guards below still apply, and any spend beyond the credits, or adding a payment method, needs him.
- Commands that spend money: `baseten train push`, `baseten train checkpoint deploy` (without `--dry-run`), `baseten model push` (without `--watch`), promoting a deployment, changing autoscaling, or an eval run against a paid endpoint. Before asking, state the GPU, the expected minutes, the dollar estimate and how it will be stopped.
- Every training job MUST set `max_steps` (no open-ended epochs) and run on **1x H100** unless Amit approves more. Run a 50-step smoke job before any full run.
- After launching a job, tail its logs. If it fails or hangs, stop it at once with `baseten train job stop --job-id <id>`.
- Every deployment MUST have `min_replica: 0` (scale to zero) and `max_replica: 1`. Never leave a replica pinned up.
- Every Baseten spend MUST be recorded in `docs/cost-log.md` (date, what, GPU, minutes, estimated $), in the same commit as the change that caused it.
- Budget: **$100 of Dedicated Inference credits, $101 of Model APIs credits, no Training credits, no payment method on file** (2026-11-05). `baseten org billing usage` bills Training as its own category. If Baseten refuses a training job, or it would need a payment method, use Plan B (below) rather than adding one. Never add a payment method or exceed the credits without asking.
- Prefer free checks: `--dry-run`, development deployments (not billed per the docs), local tests with fakes.

Reference prices (docs.baseten.co/deployment/resources, 2026-11-05): H100 $0.10833/min (~$6.50/hr), H200 $0.125/min, A10G $0.02012/min, L4 $0.01414/min. Cold starts and model loading are billed. Scaled-to-zero replicas are not.

## How It Works

```
browser (Vercel static page, React + MUI)
   │  POST /api/ask {dbId, question, model}     (same origin, no CORS)
   ▼
Vercel Function api/ask.ts → backend/ (Bun + TypeScript)
   │  1. build prompt: schema of dbId + question        (backend/prompt.ts, must match training/train.py)
   │  2. call Baseten OpenAI-compatible endpoint         (backend/baseten.ts, the only file that holds the key)
   │  3. check the SQL is one read-only SELECT           (backend/sql.ts)
   │  4. run it on a read-only SQLite sample DB          (bun:sqlite, row and time limits)
   ▼
{ sql, columns, rows, latencyMs, model }
```

- **Training, Plan A** (`training/`, Python, runs on Baseten): TRL `SFTTrainer` + PEFT LoRA on `gretelai/synthetic_text_to_sql` (Apache-2.0, ~100k examples, each with `CREATE TABLE` + `INSERT` context, so queries can be executed). Checkpoints are written to `$BT_CHECKPOINT_DIR`, and Baseten syncs them.
- **Training, Plan B** (`training/mlx/`, runs on Amit's Mac: M5, 32 GB): if Baseten Training can't run without a payment method, fine-tune the same model on the same data with `mlx_lm.lora`, fuse the adapter, upload the merged model to a private Hugging Face repo and deploy that repo on Baseten (Dedicated credits). Training is free; only serving costs.
- **Serving**: the LoRA checkpoint is deployed with `baseten train checkpoint deploy` (served by vLLM, OpenAI-compatible). The served model name is the checkpoint name (e.g. `checkpoint-500`).
- **Eval** (`eval/`, TypeScript): **execution accuracy** on a fixed held-out set. Run the gold SQL and the generated SQL on the example's own context in SQLite and compare result sets. Report the fine-tuned model, the base model and a large Model APIs model side by side, with P50/P90 latency. Same set, same prompt, every time.
- **Sample databases** (`backend/db/`): Chinook (MIT license) plus any added later, opened read-only.

## Tech Stack

- **Runtime and tooling**: Bun (install, scripts, server, frontend bundling, tests). Python only in `training/`, because it runs on Baseten's GPUs.
- **Frontend**: React + Material UI, bundled by Bun (`bun build frontend/index.html`). No Vite, no Next.js. Hosted on Vercel as static files.
- **Backend**: Vercel Functions (`api/`), thin wrappers over plain TypeScript modules in `backend/`. Calls Baseten with `fetch`; no OpenAI SDK needed. Locally, `backend/dev.ts` runs `Bun.serve` with the same handlers and serves the frontend, so `vercel dev` isn't needed.
- **Model**: `Qwen/Qwen2.5-Coder-1.5B-Instruct` (Apache-2.0) + LoRA (r=16). It is the smallest model that can plausibly pass and is cheap to train and serve. Move to 3B only if evals say so.
- **Infrastructure as Code**: Vercel in `vercel.json` (build, output, function settings, included DB files), Baseten in `training/config.py` and `training/deploy_checkpoints.py`. No ClickOps after first setup; env var names are listed below and in `.env.example`.

## Folder Structure

```
TextToSQL/
├── .claude/rules/          # coding rules, loaded by path (see Rules)
├── vercel.json             # Vercel: build command, output dir, functions, included DB files
├── api/                    # Vercel Functions: thin wrappers (ask.ts, dbs.ts, health.ts) over backend/
├── training/               # runs on Baseten, never locally on a GPU
│   ├── config.py           # TrainingProject: image, 1x H100, secrets, checkpointing
│   ├── run.sh              # start command: pip install, python train.py
│   ├── train.py            # TRL SFT + LoRA; builds prompts exactly like backend/prompt.ts
│   ├── deploy_checkpoints.py # DeployCheckpointsConfig: base model, LoRA rank, GPU
│   └── mlx/                # Plan B: local MLX fine-tune on the Mac (only if Plan A is blocked)
├── backend/
│   ├── handlers.ts         # ask, dbs, health: Request → Response, dependencies passed in
│   ├── dev.ts              # local only: Bun.serve with the handlers + the frontend
│   ├── config.ts           # env vars: read and validated once at startup
│   ├── log.ts              # structured JSON logs
│   ├── baseten.ts          # the only module that calls Baseten
│   ├── prompt.ts           # schema + question → chat messages (mirror of train.py)
│   ├── sql.ts              # read-only guard + bun:sqlite execution with limits
│   ├── types.ts            # request/response types shared with the frontend
│   ├── db/                 # sample SQLite databases (read-only)
│   └── tests/              # mirrors backend/
├── frontend/
│   ├── index.html, main.tsx, app.tsx, theme.ts
│   ├── components/         # chat thread, SQL block, results table, db picker
│   ├── hooks/, lib/        # lib/ = pure, tested logic
│   └── tests/              # mirrors frontend/
├── eval/
│   ├── data/               # fixed held-out set (committed, never trained on)
│   ├── run.ts              # runs one model over the set, writes eval/results/<model>-<date>.json
│   └── score.ts            # execution match (pure, tested)
├── docs/
│   ├── task-specs/TASK_INDEX.md  # tasks in order, with acceptance criteria
│   └── cost-log.md               # every Baseten spend
├── package.json            # one, at the root
├── CLAUDE.md
└── README.md               # results, tradeoffs, what I'd do for a real customer
```

## Rules

Coding rules live in `.claude/rules/` and load only when a matching file is touched:

- `typescript.rules.md`: all `.ts`/`.tsx`
- `backend.rules.md`: `backend/` (Baseten boundary, SQL safety, cost guards, logging)
- `react.rules.md`: `frontend/` (chat state, components, security, MUI)
- `testing.rules.md`: `*.test.ts(x)`
- `training.rules.md`: `training/` and `eval/` (cost, reproducibility, prompt parity)

## Environment Variables

Backend (Vercel project env vars, set with `vercel env add`; secrets never in Git, IaC files or chat):

- `BASETEN_API_KEY`: secret. Start with a Personal key for development. For production, use a **Team key restricted to the TextToSQL model** (least privilege).
- `BASETEN_MODEL_ID`: the fine-tuned deployment's model ID (`model-<id>.api.baseten.co`).
- `BASETEN_SERVED_MODEL`: the checkpoint name the deployment serves (e.g. `checkpoint-500`).
- `FRONTIER_MODEL`: the Model APIs model slug used for comparison (optional; off when unset).
- `DAILY_MODEL_CALLS`: cap on Baseten calls per day per function instance (default 500). Past it, `/api/ask` returns 429.

Baseten workspace secrets (set in the Baseten dashboard): `hf_access_token`, used by training and checkpoint deploys to download the base model.

Local: `baseten auth login` for the CLI. The API key goes in `.env` (gitignored); `.env.example` lists the names only.

## Commands

```bash
bun install
bun run dev            # backend/dev.ts: handlers + frontend with hot reload
bun run format         # Prettier
bun run lint           # rules of React hooks
bun run typecheck
bun test               # no network, no Baseten
bun eval/run.ts --model <name> --limit 50   # costs money if the target is a Baseten endpoint: ask first
```

```bash
# Baseten (every command except --dry-run, list and logs costs money: ask first)
baseten train push --config training/config.py
baseten train job logs --job-id <id> --tail
baseten train job stop --job-id <id>
baseten train checkpoint list --job-id <id>
baseten train checkpoint deploy --config training/deploy_checkpoints.py --dry-run --config-out-dir ./generated
baseten train checkpoint deploy --config training/deploy_checkpoints.py
```

```bash
vercel deploy            # preview deploy
vercel deploy --prod     # production
```

## Testing

- `bun test` never calls Baseten or any network. Tests replace `baseten.ts` with a fake passed in as an argument.
- The SQL guard and execution limits are security code: test every rejection path.
- Eval scoring (`eval/score.ts`) is pure and fully tested. The eval run itself is checked by running it.
- Integration tests call the handlers directly with a fake Baseten client; no server or network needed.
- GitHub Actions runs format check, lint, typecheck and `bun test --coverage` on every push and PR.
- Write the test first, see it fail, then implement.

## Security Model

- The Baseten key lives only in the backend. The browser never talks to Baseten.
- Generated SQL is untrusted input. It runs only after the read-only guard, on a database opened read-only, with row and time limits.
- The page is public, so abuse means spend. Rate limits per IP and the daily call cap are not optional. They are in memory per function instance (ponytail: move to Vercel KV/Upstash if this ever gets real traffic). The hard ceiling is on Baseten: `max_replica: 1` and scale to zero.

## Browser Automation

Do not run browser automation (playwright-cli or claude-in-chrome) unless Amit explicitly asks. When he does, use the `/playwright-cli` skill.

## Specs and Tasks

- **Tasks**: `docs/task-specs/TASK_INDEX.md` lists every task in order, with scope and acceptance criteria. Work on the first task that is not struck through and whose dependencies are done.
- **When a task is done**, strike its line through (`~~...~~`) and commit that with the task's last change.
- Steps marked **asks the user** are covered by the standing approval above unless they would exceed the credits.

## Git Conventions

- Commit messages must be at most 2 sentences/phrases long.
- Commit and push to GitHub after each meaningful file or logical unit of work is complete.
- Never commit keys, `.env`, checkpoints or model weights.
