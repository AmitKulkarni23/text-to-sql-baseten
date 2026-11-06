import type { ModelChoice } from './types.ts'

export type Target = { baseUrl: string; model: string }
/** `wakeUrl` starts the scaled-to-zero deployment without sending a request. */
export type Config = { apiKey: string; targets: Partial<Record<ModelChoice, Target>>; wakeUrl?: string; dailyCalls: number }

export const BASE_MODEL = 'Qwen/Qwen2.5-Coder-1.5B-Instruct'

/**
 * Reads config from an env object (normally `process.env`). Throws naming the variable when one is invalid.
 * The tuned and base targets need BASETEN_MODEL_ID; frontier needs FRONTIER_MODEL. Each is off when unset.
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const apiKey = env.BASETEN_API_KEY
  if (!apiKey) throw new Error('BASETEN_API_KEY is required')

  const targets: Config['targets'] = {}
  if (env.BASETEN_MODEL_ID) {
    if (!/^[a-z0-9]+$/.test(env.BASETEN_MODEL_ID)) throw new Error(`BASETEN_MODEL_ID must be a Baseten model ID, got "${env.BASETEN_MODEL_ID}"`)
    if (!env.BASETEN_SERVED_MODEL) throw new Error('BASETEN_SERVED_MODEL is required with BASETEN_MODEL_ID')
    const baseUrl = `https://model-${env.BASETEN_MODEL_ID}.api.baseten.co/environments/production/sync/v1`
    targets.tuned = { baseUrl, model: env.BASETEN_SERVED_MODEL }
    targets.base = { baseUrl, model: BASE_MODEL }
  }
  const wakeUrl = env.BASETEN_MODEL_ID ? `https://model-${env.BASETEN_MODEL_ID}.api.baseten.co/environments/production/wake` : undefined
  if (env.FRONTIER_MODEL) targets.frontier = { baseUrl: 'https://inference.baseten.co/v1', model: env.FRONTIER_MODEL }

  const dailyCalls = env.DAILY_MODEL_CALLS ? Number(env.DAILY_MODEL_CALLS) : 500
  if (!Number.isInteger(dailyCalls) || dailyCalls < 1) throw new Error(`DAILY_MODEL_CALLS must be a positive integer, got "${env.DAILY_MODEL_CALLS}"`)

  return { apiKey, targets, wakeUrl, dailyCalls }
}
