---
paths:
  - "training/**"
  - "eval/**"
---

# Training and Eval Rules

## Cost

- Every command that starts a Baseten job, deployment or paid eval run MUST be approved by Amit in the same turn, after showing the GPU, minutes and dollar estimate. See "Cost Rules" in `CLAUDE.md`.
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

- Python lives only in `training/` and runs on Baseten. It MUST use the libraries already in `run.sh` (`trl`, `peft`, `transformers`, `datasets`) and MUST NOT add others without a reason in the commit message.
- Checkpoints MUST be written to `$BT_CHECKPOINT_DIR`. Secrets MUST be read from env vars set by `SecretReference` (e.g. `hf_access_token` → `HF_TOKEN`), never hard-coded.
- The LoRA rank in `deploy_checkpoints.py` MUST match `train.py`.
