import type { ModelChoice } from '../../backend/types.ts'

/**
 * Held-out execution accuracy, copied from eval/results/*.json (summary.accuracy, summary.latencyMs).
 * 300 questions from the test split of gretelai/synthetic_text_to_sql. Update after every eval run.
 */
export type EvalRow = { model: ModelChoice; label: string; accuracy: number; p50: number; source: string }

export const EVAL_N = 300

/** Footnote for the starred row. */
export const EVAL_NOTE = 'A 300-question set has a margin of about ±5 points, so 63.3 vs 67.0 is close to a tie.'

export const EVAL_ROWS: EvalRow[] = [
  { model: 'tuned', label: 'Fine-tuned 1.5B', accuracy: 63.3, p50: 508, source: 'tuned-600steps-2026-11-06.json' },
  { model: 'base', label: 'Base 1.5B', accuracy: 52.3, p50: 447, source: 'base-qwen2.5-coder-1.5b-2026-11-06.json' },
  { model: 'frontier', label: 'DeepSeek-V4.1-Flash', accuracy: 67.0, p50: 952, source: 'frontier-deepseek-v4.1-flash-2026-11-06.json' },
]
