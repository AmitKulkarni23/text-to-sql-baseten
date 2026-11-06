"""LoRA SFT for text-to-SQL. Runs on Baseten (see config.py); SMOKE=1 runs 50 steps on 500 examples.

Prompts MUST match backend/prompt.ts (PROMPT_VERSION). Loss is on the SQL only (prompt-completion format).
"""
import os
import re

from datasets import load_dataset
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

PROMPT_VERSION = 1  # keep in sync with backend/prompt.ts
SYSTEM_PROMPT = (
    "You write SQLite queries. Given a database schema and a question, "
    "reply with exactly one SQLite SELECT query and nothing else."
)
BASE_MODEL = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
DATASET = "gretelai/synthetic_text_to_sql"
REVISION = "740ab236e64503fba51be1101df7a1be83bf455d"  # same pin as eval/build-heldout.ts
SEED = 20261105
LORA_RANK = 16  # deploy_checkpoints.py must use the same rank
SMOKE = os.environ.get("SMOKE") == "1"
TRAIN_EXAMPLES = 500 if SMOKE else 9_600
MAX_STEPS = 50 if SMOKE else 600  # 9.6k examples / 16 per step = 1 epoch (~85 min on an M5 at ~8.5 s/step)


def schema_only(context: str) -> str:
    """Mirror of schemaOnly() in backend/prompt.ts: CREATE statements only, never rows."""
    return "\n".join(m.group(0) for m in re.finditer(r"CREATE\s+(?:TABLE|VIEW)\b[^;]*;", context, re.IGNORECASE))


def to_example(row: dict) -> dict:
    """Mirror of buildMessages() in backend/prompt.ts, plus the gold SQL as the completion."""
    return {
        "prompt": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Schema:\n{schema_only(row['sql_context'])}\n\nQuestion: {row['sql_prompt']}"},
        ],
        "completion": [{"role": "assistant", "content": row["sql"]}],
    }


# Train split only (the eval set comes from the test split). Same filter as the product: read-only questions.
data = load_dataset(DATASET, split="train", revision=REVISION)
data = data.filter(
    lambda r: r["sql_task_type"] == "analytics and reporting" and re.match(r"\s*(select|with)\b", r["sql"], re.IGNORECASE) is not None
)
print(f"usable train rows: {len(data)}")
data = data.shuffle(seed=SEED).select(range(min(TRAIN_EXAMPLES, len(data))))
data = data.map(to_example, remove_columns=data.column_names)

args = SFTConfig(
    output_dir=os.getenv("BT_CHECKPOINT_DIR", "./checkpoints"),
    max_steps=MAX_STEPS,
    per_device_train_batch_size=2,  # effective batch 16; small micro-batches keep a 32 GB Mac out of swap
    gradient_accumulation_steps=8,
    gradient_checkpointing=True,
    model_init_kwargs={"torch_dtype": "bfloat16"},
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    max_length=512,  # schema + question + SQL; longer examples are truncated
    bf16=True,
    logging_steps=10,
    save_steps=25 if SMOKE else 150,
    seed=SEED,
    report_to="none",
)

trainer = SFTTrainer(
    model=BASE_MODEL,
    args=args,
    train_dataset=data,
    peft_config=LoraConfig(r=LORA_RANK, lora_alpha=2 * LORA_RANK, lora_dropout=0.05, target_modules="all-linear", task_type="CAUSAL_LM"),
)
trainer.train()
trainer.save_model(args.output_dir)
