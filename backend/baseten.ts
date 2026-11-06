import type { ChatMessage } from './prompt.ts'
import type { Target } from './config.ts'

export type Completion = { text: string; promptTokens: number; completionTokens: number }

/** Thrown with a status the handler maps to a user-facing code. */
export class BasetenError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'unavailable',
  ) {
    super(message)
  }
}

export type Complete = (target: Target, messages: ChatMessage[]) => Promise<Completion>

/** The only code that calls Baseten. One try, no retries: a retry doubles spend and a cold start just needs patience. */
export function createComplete(apiKey: string, timeoutMs = 55_000): Complete {
  return async (target, messages) => {
    let res: Response
    try {
      res = await fetch(`${target.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: target.model, messages, max_tokens: 512, temperature: 0 }),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
      throw new BasetenError(timedOut ? 'timed out' : String(err), timedOut ? 'timeout' : 'unavailable')
    }
    if (!res.ok) throw new BasetenError(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`, 'unavailable')
    const body: unknown = await res.json()
    const parsed = body as { choices?: { message?: { content?: unknown } }[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } }
    const text = parsed.choices?.[0]?.message?.content
    if (typeof text !== 'string') throw new BasetenError('response had no message content', 'unavailable')
    const promptTokens = Number(parsed.usage?.prompt_tokens ?? 0)
    const completionTokens = Number(parsed.usage?.completion_tokens ?? 0)
    return { text, promptTokens, completionTokens }
  }
}

/** Asks Baseten to start a scaled-to-zero deployment. Fire and forget: 202 means the boot has started (or it is already up). */
export async function wake(apiKey: string, wakeUrl: string): Promise<boolean> {
  const res = await fetch(wakeUrl, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) }).catch(() => undefined)
  return res?.ok ?? false
}
