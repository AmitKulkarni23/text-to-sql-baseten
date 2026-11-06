import type { ApiError, AskResponse, ModelChoice } from '../../backend/types.ts'

/** One model's attempt at a question. */
export type Run = {
  model: ModelChoice
  status: 'pending' | 'done' | 'error'
  /** True once a request timed out on a cold start and is being retried. */
  waking?: boolean
  result?: AskResponse
  error?: ApiError['error']
}

/** A numbered question ("Query 3") and every model's run on it, in the order they were asked. */
export type Turn = { id: number; question: string; runs: Run[] }

/** The thread keeps the newest turns only. */
export const MAX_TURNS = 50

/** A cold start takes a few minutes and each request waits up to 55 s, so retry for about 6 minutes. */
export const COLD_START_RETRIES = 7

export const MODEL_ORDER: ModelChoice[] = ['tuned', 'base', 'frontier']

export const MODEL_LABELS: Record<ModelChoice, string> = {
  tuned: 'Fine-tuned 1.5B',
  base: 'Base 1.5B',
  frontier: 'DeepSeek-V4.1-Flash',
}

/** Labels for the narrow model switch on phones. */
export const MODEL_SHORT: Record<ModelChoice, string> = { tuned: 'Fine-tuned', base: 'Base', frontier: 'Frontier' }

export function addTurn(turns: Turn[], turn: Turn): Turn[] {
  return [...turns, turn].slice(-MAX_TURNS)
}

export function addRuns(turns: Turn[], id: number, models: ModelChoice[]): Turn[] {
  return turns.map(t =>
    t.id === id
      ? { ...t, runs: [...t.runs, ...models.filter(m => !t.runs.some(r => r.model === m)).map(model => ({ model, status: 'pending' as const }))] }
      : t,
  )
}

export function updateRun(turns: Turn[], id: number, model: ModelChoice, patch: Partial<Run>): Turn[] {
  return turns.map(t => (t.id === id ? { ...t, runs: t.runs.map(r => (r.model === model ? { ...r, ...patch } : r)) } : t))
}

/** Two runs agree when they return the same rows, in any order. */
export function sameRows(a: AskResponse, b: AskResponse): boolean {
  if (a.rows.length !== b.rows.length) return false
  const key = (rows: unknown[][]): string[] => rows.map(r => JSON.stringify(r.map(v => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)))).sort()
  const [x, y] = [key(a.rows), key(b.rows)]
  return x.every((k, i) => k === y[i])
}
