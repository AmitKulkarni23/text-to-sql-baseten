import type { ApiError, AskResponse, ModelChoice } from '../../backend/types.ts'

export type Turn = {
  id: number
  question: string
  model: ModelChoice
  status: 'pending' | 'done' | 'error'
  result?: AskResponse
  error?: ApiError['error']
}

/** The thread keeps the newest turns only. */
export const MAX_TURNS = 50

export function addTurn(turns: Turn[], turn: Turn): Turn[] {
  return [...turns, turn].slice(-MAX_TURNS)
}

export function settleTurn(turns: Turn[], id: number, patch: Pick<Turn, 'status' | 'result' | 'error'>): Turn[] {
  return turns.map(t => (t.id === id ? { ...t, ...patch } : t))
}

export const MODEL_LABELS: Record<ModelChoice, string> = {
  tuned: 'Fine-tuned 1.5B',
  base: 'Base 1.5B',
  frontier: 'Frontier',
}
