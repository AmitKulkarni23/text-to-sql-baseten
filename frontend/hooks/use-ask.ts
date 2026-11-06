import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelChoice } from '../../backend/types.ts'
import { ask } from '../lib/api.ts'
import { addRuns, addTurn, COLD_START_RETRIES, type Turn, updateRun } from '../lib/turns.ts'

type Ask = { dbId: string; question: string; model: ModelChoice }

/**
 * The thread. `send` adds a numbered turn with one run; `compare` adds runs for other models on the same question.
 * Requests that time out on a cold start retry until the model is up. All requests abort on unmount.
 */
export function useAsk(): { turns: Turn[]; send: (request: Ask) => void; compare: (turn: Turn, dbId: string, models: ModelChoice[]) => void } {
  const [turns, setTurns] = useState<Turn[]>([])
  const controllers = useRef(new Set<AbortController>())
  const nextId = useRef(1)

  useEffect(() => {
    const active = controllers.current
    return () => active.forEach(c => c.abort())
  }, [])

  const run = useCallback((id: number, request: Ask) => {
    const controller = new AbortController()
    controllers.current.add(controller)
    const attempt = async (): Promise<void> => {
      for (let tries = 0; ; tries++) {
        const outcome = await ask(request, controller.signal)
        if (!outcome.ok && outcome.error.code === 'model_timeout' && tries < COLD_START_RETRIES) {
          setTurns(prev => updateRun(prev, id, request.model, { waking: true }))
          continue
        }
        setTurns(prev =>
          updateRun(prev, id, request.model, outcome.ok ? { status: 'done', result: outcome.result } : { status: 'error', error: outcome.error }),
        )
        return
      }
    }
    attempt()
      .catch(() => undefined) // aborted on unmount
      .finally(() => controllers.current.delete(controller))
  }, [])

  const send = useCallback(
    (request: Ask) => {
      const id = nextId.current++
      setTurns(prev => addTurn(prev, { id, question: request.question, runs: [{ model: request.model, status: 'pending' }] }))
      run(id, request)
    },
    [run],
  )

  const compare = useCallback(
    (turn: Turn, dbId: string, models: ModelChoice[]) => {
      const missing = models.filter(m => !turn.runs.some(r => r.model === m))
      setTurns(prev => addRuns(prev, turn.id, missing))
      missing.forEach(model => run(turn.id, { dbId, question: turn.question, model }))
    },
    [run],
  )

  return { turns, send, compare }
}
