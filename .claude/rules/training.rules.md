---
paths:
  - "training/**"
  - "eval/**"
  - "serving/**"
---

# Training and Eval Rules

## Cost

- Every command that starts a Baseten job, deployment or paid eval run follows "Cost Rules" in `CLAUDE.md` (standing approval within the credits; log every spend).
- `train.py` MUST set `max_steps`. `config.py` MUST use 1x H100 unless Amit approved more.
- `train.py` MUST support `SMOKE=1`, which runs 50 steps on 500 examples, so every new config is smoke-tested first.
- Each spend MUST be logged in `docs/cost-log.md`.

## Reproducibility

- Training data MUST be loaded from `gretelai/synthetic_text_to_sql` at a pinned dataset revision, with a fixed seed.
- `eval/data/` is the held-out set. It MUST be drawn from the dataset's `test` split only, MUST be committed, and MUST NOT change once a result has been recorded. Training MUST use only the `train` split.
- Eval examples MUST be filtered to those whose context and gold SQL run in SQLite, so execution match is meaningful.
- Every eval result file MUST record the model, the checkpoint, the dataset revision, the prompt version, the example count, the date and P50/P90 latency.

## Prompt parity

- `train.py` and `backend/prompt.ts` MUST build the same chat messages (system prompt, schema, question) for the same input. Bump `PROMPT_VERSION` in both when either changes.

## Python

- Python lives only in `training/`. It runs on Baseten (Plan A) or unchanged on the Mac (Plan B, in use). It MUST use the libraries already in `run.sh` (`trl`, `peft`, `transformers`, `datasets`) and MUST NOT add others without a reason in the commit message.
- Checkpoints MUST be written to `$BT_CHECKPOINT_DIR` (falls back to `training/checkpoints/` locally). Secrets MUST be read from env vars set by `SecretReference` (e.g. `hf_access_token` → `HF_TOKEN`), never hard-coded.
- `--max-lora-rank` in `serving/config.yaml` MUST be at least `LORA_RANK` in `train.py`.
