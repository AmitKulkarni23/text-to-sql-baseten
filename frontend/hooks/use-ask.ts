import { useCallback, useEffect, useRef, useState } from 'react'
import type { AskRequest } from '../../backend/types.ts'
import { ask } from '../lib/api.ts'
import { addTurn, COLD_START_RETRIES, settleTurn, type Turn } from '../lib/turns.ts'

/** The chat thread: send adds a pending turn and settles it when the API answers. Requests abort on unmount. */
export function useAsk(): { turns: Turn[]; send: (request: AskRequest) => void; busy: boolean } {
  const [turns, setTurns] = useState<Turn[]>([])
  const controllers = useRef(new Set<AbortController>())
  const nextId = useRef(1)

  useEffect(() => {
    const active = controllers.current
    return () => active.forEach(c => c.abort())
  }, [])

  const send = useCallback((request: AskRequest) => {
    const id = nextId.current++
    const controller = new AbortController()
    controllers.current.add(controller)
    setTurns(prev => addTurn(prev, { id, question: request.question, model: request.model, status: 'pending' }))
    const attempt = async (): Promise<void> => {
      for (let tries = 0; ; tries++) {
        const outcome = await ask(request, controller.signal)
        if (!outcome.ok && outcome.error.code === 'model_timeout' && tries < COLD_START_RETRIES) {
          // Cold start: the request reached Baseten and woke the GPU; keep asking until it answers.
          setTurns(prev => settleTurn(prev, id, { waking: true }))
          continue
        }
        setTurns(prev =>
          settleTurn(
            prev,
            id,
            outcome.ok ? { status: 'done', result: outcome.result, error: undefined } : { status: 'error', error: outcome.error, result: undefined },
          ),
        )
        return
      }
    }
    attempt()
      .catch(() => undefined) // aborted on unmount
      .finally(() => controllers.current.delete(controller))
  }, [])

  return { turns, send, busy: turns.some(t => t.status === 'pending') }
}
