import { BasetenError, type Complete } from './baseten.ts'
import type { Config } from './config.ts'
import { errorMessage, log } from './log.ts'
import { buildMessages } from './prompt.ts'
import { listDbs, rejectReason, runQuery, schemaFor } from './sql.ts'
import type { ApiError, AskResponse, DbsResponse, ErrorCode, ModelChoice } from './types.ts'
import { extractSql } from '../eval/score.ts'

const MAX_QUESTION = 500
const PER_IP_PER_MINUTE = 10
const MODELS: ModelChoice[] = ['tuned', 'base', 'frontier']

const json = (body: unknown, status = 200): Response => Response.json(body, { status })
const fail = (status: number, code: ErrorCode, message: string, sql?: string): Response =>
  json({ error: { code, message, ...(sql === undefined ? {} : { sql }) } } satisfies ApiError, status)

export type Handlers = { ask: (req: Request) => Promise<Response>; dbs: () => Response; health: () => Response }

/**
 * The API, as plain Request → Response functions: Vercel Functions in api/ and the local dev server both call these.
 * `config` is a function so a bad env var fails each request with config_error instead of crashing the module.
 * ponytail: rate limit and daily cap are in memory per function instance; Vercel KV/Upstash if traffic ever gets real.
 * The hard spend ceiling is Baseten's max_replica: 1 and scale to zero.
 */
export function createHandlers(config: () => Config, complete: (apiKey: string) => Complete, now = Date.now): Handlers {
  const hits = new Map<string, number[]>()
  let day = ''
  let callsToday = 0

  function limited(ip: string): ErrorCode | undefined {
    const t = now()
    const recent = (hits.get(ip) ?? []).filter(h => t - h < 60_000)
    if (recent.length >= PER_IP_PER_MINUTE) return 'rate_limited'
    const today = new Date(t).toISOString().slice(0, 10)
    if (today !== day) [day, callsToday] = [today, 0]
    if (callsToday >= config().dailyCalls) return 'budget_exhausted'
    recent.push(t)
    hits.set(ip, recent)
    if (hits.size > 10_000) hits.clear() // bounded: a flood of IPs resets the window rather than growing memory
    callsToday++
    return undefined
  }

  return {
    health: () => json({ ok: true }),

    dbs: () => {
      try {
        const targets = config().targets
        return json({ dbs: listDbs(), models: MODELS.filter(m => targets[m]) } satisfies DbsResponse)
      } catch (err) {
        log.error('config_invalid', { error: errorMessage(err) })
        return fail(500, 'config_error', 'The service is not configured yet.')
      }
    },

    ask: async req => {
      let cfg: Config
      try {
        cfg = config()
      } catch (err) {
        log.error('config_invalid', { error: errorMessage(err) })
        return fail(500, 'config_error', 'The service is not configured yet.')
      }
      const body: unknown = await req.json().catch(() => undefined)
      const { dbId, question, model } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
      if (typeof dbId !== 'string' || typeof question !== 'string' || typeof model !== 'string') {
        return fail(400, 'bad_request', 'Send dbId, question and model.')
      }
      const schema = schemaFor(dbId)
      if (!schema) return fail(400, 'bad_request', 'Unknown database.')
      const trimmed = question.trim()
      if (!trimmed || trimmed.length > MAX_QUESTION) return fail(400, 'bad_request', `Ask a question of 1 to ${MAX_QUESTION} characters.`)
      const target = MODELS.includes(model as ModelChoice) ? cfg.targets[model as ModelChoice] : undefined
      if (!target) return fail(400, 'bad_request', 'That model is not available.')

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
      const limit = limited(ip)
      if (limit === 'rate_limited') return fail(429, limit, 'Too many questions. Wait a minute and try again.')
      if (limit) return fail(429, limit, 'The demo has used its model budget for today. Try again tomorrow.')

      const started = performance.now()
      const fields = { model, dbId, question: trimmed.slice(0, 200) }
      let sql: string
      try {
        const completion = await complete(cfg.apiKey)(target, buildMessages(schema, trimmed))
        sql = extractSql(completion.text)
        log.info('ask_completed', {
          ...fields,
          latencyMs: Math.round(performance.now() - started),
          promptTokens: completion.promptTokens,
          completionTokens: completion.completionTokens,
          ok: true,
        })
      } catch (err) {
        const timeout = err instanceof BasetenError && err.kind === 'timeout'
        log.error('ask_failed', {
          ...fields,
          latencyMs: Math.round(performance.now() - started),
          ok: false,
          errorCode: timeout ? 'model_timeout' : 'model_unavailable',
          error: errorMessage(err),
        })
        return timeout
          ? fail(504, 'model_timeout', 'The model is still waking up. Try again in a minute.')
          : fail(502, 'model_unavailable', 'The model is not reachable right now.')
      }
      const latencyMs = Math.round(performance.now() - started)

      const reason = rejectReason(sql)
      if (reason) return fail(422, 'unsafe_sql', reason, sql)
      try {
        return json({ model: model as ModelChoice, sql, ...runQuery(dbId, sql), latencyMs } satisfies AskResponse)
      } catch (err) {
        return fail(422, 'sql_error', `The query failed: ${errorMessage(err)}`, sql)
      }
    },
  }
}
