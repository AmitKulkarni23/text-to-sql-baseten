import { useCallback, useEffect, useRef, useState } from 'react'
import type { AskRequest } from '../../backend/types.ts'
import { ask } from '../lib/api.ts'
import { addTurn, settleTurn, type Turn } from '../lib/turns.ts'

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
    ask(request, controller.signal)
      .then(outcome =>
        setTurns(prev =>
          settleTurn(
            prev,
            id,
            outcome.ok ? { status: 'done', result: outcome.result, error: undefined } : { status: 'error', error: outcome.error, result: undefined },
          ),
        ),
      )
      .catch(() => undefined) // aborted on unmount
      .finally(() => controllers.current.delete(controller))
  }, [])

  return { turns, send, busy: turns.some(t => t.status === 'pending') }
}
