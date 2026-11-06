# Cost Log

Every Baseten spend, newest last. Estimated $ = minutes × the per-minute rate in docs.baseten.co/deployment/resources. Check the actual figure on the Baseten billing page afterwards and fill it in.

Starting credits (2026-11-05): Dedicated Inference $100, Model APIs $101, Tool Calls $2. No payment method on file.

| Date | What | GPU | Minutes | Estimated $ | Actual $ | Job / deployment ID |
|---|---|---|---|---|---|---|
| 2026-11-06 | TASK-003 frontier baseline: DeepSeek-V4.1-Flash, 300 questions (31k in / 64k out tokens) | Model APIs | - | 0.09 | | - |
| 2026-11-06 | Training on Baseten: refused (403, no Training access). Trained on the Mac instead | M5 (local) | 7 + ~80 | 0 | 0 | - |
| 2026-11-06 | Serving deploy (smoke adapter) + base and smoke evals (600 requests); scales to zero 15 min after the last request | L4 | ~30 incl. boot and idle tail | ~0.45 | | model w7m8kz6w / deployment 31rj7d9 |
