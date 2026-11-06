#!/bin/bash
set -eux
pip install "trl==0.24.0" "peft==0.17.1" "transformers==4.57.1" "datasets==4.2.0" "accelerate==1.10.1"
python train.py
