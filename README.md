# TextToSQL

Ask a database a question in plain English and get the SQL and its results. A 1.5B open model (Qwen2.5-Coder-1.5B-Instruct), fine-tuned with LoRA for text-to-SQL, writes the query. It is served on [Baseten](https://www.baseten.co/) and measured against its base model and a large hosted model.

*Inference Engineering* (Kiely, Baseten Books 2026) says in §1.3.2 that "for an application that only needs to generate SQL queries from natural language prompts, a tiny fine-tuned model of just a few billion parameters can reach equivalent performance on this specific task." This project measures that claim on a small budget, following the forward-deployed loop: frame the problem, evaluate, train, deploy, monitor.

## Results

300 held-out questions from the test split of `gretelai/synthetic_text_to_sql`. Each question was run against its own SQLite database, so this is **execution accuracy**: the generated query has to return the same rows as the reference query. Same prompt and settings for every model (temperature 0).

| Model | Params | Accuracy | P50 latency | P90 latency | Served on |
|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash (Baseten Model APIs) | frontier MoE | 67.0% | 952 ms | 1,899 ms | shared Model API |
| Qwen2.5-Coder-1.5B-Instruct, base | 1.5B | 52.3% | 447 ms | 737 ms | 1x L4, vLLM |
| + LoRA, 50 steps (smoke run) | 1.5B | 58.7% | 508 ms | 821 ms | 1x L4, vLLM |
| **+ LoRA, 600 steps (1 epoch, 9.6k examples)** | 1.5B | **63.3%** | **508 ms** | **779 ms** | 1x L4, vLLM |

Latency is end to end from my laptop, so it includes network time. The frontier model also spends tokens reasoning (64k completion tokens over 300 questions, about 7x the SQL it returned). That costs latency and money for no gain on a task this narrow.

**Reading it.** Fine-tuning added 11 points over the base model and closed most of the gap to the frontier model: 63.3% against 67.0%. That difference is inside the noise of a 300-question set (about ±5 points). The fine-tuned model also answers at half the latency and writes about 8x fewer output tokens (8k against 64k for the same 300 questions), because it doesn't reason before answering. That is the book's claim, roughly holding: on a cleanly scoped task, a 1.5B model on one L4 lands near a frontier MoE at a fraction of the cost per query.

By difficulty, the fine-tuned model **beats the frontier on joins, subqueries and window functions** and trails on simple selects and aggregations:

| SQL complexity | n | Base 1.5B | Fine-tuned 1.5B | DeepSeek-V4.1-Flash |
|---|---|---|---|---|
| basic SQL | 158 | 64.6 | 70.9 | **75.9** |
| aggregation | 79 | 40.5 | 58.2 | **69.6** |
| single join | 35 | 48.6 | **62.9** | 51.4 |
| subqueries | 13 | 38.5 | **53.8** | 46.2 |
| window functions | 9 | 0.0 | **22.2** | 11.1 |
| multiple joins | 5 | 20.0 | 20.0 | 20.0 |

The small groups (n = 5 to 13) are anecdotes, not findings. Some of the "wins" are the fine-tuned model matching the dataset's labelling style (see below).

Training: 600 steps at an effective batch of 16 (one epoch over 9.6k examples). It took 77 minutes on an M5 MacBook. Loss fell from 0.41 to about 0.22 and was flat for the last third, so more steps on the same data would buy little; more varied data would buy more.

The full results for each run, including every generated query, are in `eval/results/`.

## How it works

```
browser (React + MUI, static on Vercel)
  └─ POST /api/ask {dbId, question, model}
       Vercel Function (Bun) ─ prompt: compact schema + question
         ├─ Baseten: vLLM on 1x L4 serving base + LoRA adapter (model field picks one)
         │   or Baseten Model APIs for the frontier comparison
         ├─ guard: one read-only SELECT/WITH, else 422 with the SQL shown
         └─ bun:sqlite, database opened read-only, max 200 rows → {sql, columns, rows, latencyMs}
```

- **Data**: `gretelai/synthetic_text_to_sql` (Apache-2.0) at a pinned revision. Training uses only the train split, filtered to read-only analytics questions (88k usable, 9.6k sampled). The eval set is drawn only from the test split.
- **Prompt**: the model sees `CREATE TABLE` statements only, never rows. The same prompt is used in training (`training/train.py`), eval and the API (`backend/prompt.ts`), and a check confirms they are identical.
- **Training**: TRL SFT + PEFT LoRA (r=16, all linear layers), loss on the SQL only. The plan was Baseten Training on 1x H100. My account returned `403 not authorized for Baseten training` (no Training credits, no payment method), so the same script ran unchanged on an M5 MacBook (PyTorch MPS): about 7.5 s per step and under 7 GB of memory after tuning the batch size.
- **Serving**: a Truss (`serving/config.yaml`) that runs `vllm serve` with `--enable-lora`. One L4 serves both the base model and the adapter, so the A/B comparison costs no extra GPU. Base weights are mirrored by Baseten (`weights:`), so a boot doesn't re-download them from Hugging Face. Defaults: scale to zero after 15 idle minutes, max 1 replica.
- **Cold starts**: the first boot took 6.5 min: 2.3 min container start, 1.5 min weight download (now cached), and 1 min engine warmup plus CUDA graphs. The app wakes the GPU when someone focuses the question box and keeps retrying a question with a "waking the model" notice until the model is up.
- **App**: typeset like a paper's results section. Each question is a numbered query with its SQL and a captioned results table, and models carry matplotlib's colours. **Compare models** asks the same question of all three and tabulates rows, agreement with the fine-tuned answer, and latency.

## Cost

See `docs/cost-log.md`. Everything ran on free credits: about $0.09 of Model APIs for the frontier baseline and roughly $1 to $2 of L4 time for two deployments and four eval runs. Training cost $0 because it ran locally. Serving costs about $0.85/hr while the GPU is awake and nothing while it is scaled to zero.

## What I'd watch out for (eval honesty)

- **The labels have a style.** Some reference queries are verbose, for example `ROW_NUMBER()` in a subquery where `LIMIT 3` would do, which returns an extra column. Execution match counts the plain answer wrong. A model fine-tuned on this data learns that style, so part of its gain over the frontier model is learning the grader rather than learning SQL. A stricter test would use a second benchmark (Spider/BIRD) or relaxed column matching.
- **Some labels are wrong.** In one test example the reference query ignores the question's filter. Read failures before trusting a number.
- **Chinook is not the training distribution.** The training schemas are 1 to 3 small tables; Chinook has 11. The demo shows transfer, but it isn't in the measured number.

## What I'd do next for a real customer

1. Build an eval set from the customer's own schemas and real questions. Agree on the pass bar first.
2. Try 3B before going bigger, and stop at the smallest model that passes.
3. Serving: FP8 on L4 or H100, Engine-Builder (TensorRT-LLM) for lower latency, and prefix caching (the schema is a shared prefix across every question on the same database).
4. Retrieve only the relevant tables for large databases instead of putting the whole schema in the prompt.
5. Log failed and corrected queries from the app as the next training set.

## Run it

See `CLAUDE.md` for commands, env vars and cost rules.
