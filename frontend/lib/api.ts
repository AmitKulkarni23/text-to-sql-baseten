import type { ApiError, AskRequest, AskResponse, DbsResponse } from '../../backend/types.ts'

export type AskOutcome = { ok: true; result: AskResponse } | { ok: false; error: ApiError['error'] }

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null && 'error' in body
}

export async function fetchDbs(signal: AbortSignal): Promise<DbsResponse> {
  const res = await fetch('/api/dbs', { signal })
  const body: unknown = await res.json()
  if (!res.ok || isApiError(body)) throw new Error(isApiError(body) ? body.error.message : `HTTP ${res.status}`)
  return body as DbsResponse
}

export async function ask(request: AskRequest, signal: AbortSignal): Promise<AskOutcome> {
  try {
    const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal })
    const body: unknown = await res.json().catch(() => undefined)
    if (res.ok && !isApiError(body)) return { ok: true, result: body as AskResponse }
    if (isApiError(body)) return { ok: false, error: body.error }
    return { ok: false, error: { code: 'model_unavailable', message: `The server answered ${res.status}.` } }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return { ok: false, error: { code: 'model_unavailable', message: 'Could not reach the server. Check your connection.' } }
  }
}
