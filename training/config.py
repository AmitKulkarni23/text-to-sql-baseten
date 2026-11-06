"""Baseten training job: LoRA SFT of Qwen2.5-Coder-1.5B-Instruct for text-to-SQL on 1x H100.

    SMOKE=1 baseten train push --config training/config.py   # 50 steps on 500 examples
    baseten train push --config training/config.py           # full run (MAX_STEPS in train.py)

This file runs locally at push time, so os.environ here is the pusher's shell.
"""
import os

from truss.base import truss_config
from truss_train import definitions

BASE_IMAGE = "pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime"
SMOKE = os.environ.get("SMOKE", "0")

runtime = definitions.Runtime(
    start_commands=["chmod +x ./run.sh && ./run.sh"],
    environment_variables={
        "HF_TOKEN": definitions.SecretReference(name="hf_access_token"),
        "SMOKE": SMOKE,
    },
    cache_config=definitions.CacheConfig(enabled=True),
    checkpointing_config=definitions.CheckpointingConfig(enabled=True),
)

compute = definitions.Compute(
    accelerator=truss_config.AcceleratorSpec(accelerator=truss_config.Accelerator.H100, count=1),
)

training_project = definitions.TrainingProject(
    name="text-to-sql",
    job=definitions.TrainingJob(
        name="smoke" if SMOKE == "1" else "full",
        image=definitions.Image(base_image=BASE_IMAGE),
        compute=compute,
        runtime=runtime,
    ),
)
