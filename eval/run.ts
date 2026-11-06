/**
 * Runs one model over the held-out set and writes eval/results/<label>-<date>.json.
 * Costs money: every request hits a Baseten endpoint.
 *
 *   bun --env-file=.env eval/run.ts --model deepseek-ai/DeepSeek-V4.1-Flash --limit 300
 *   bun --env-file=.env eval/run.ts --model checkpoint-500 --base-url https://model-<id>.api.baseten.co/environments/production/sync/v1
 */
import { mkdirSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { PROMPT_VERSION, buildMessages, schemaOnly } from '../backend/prompt.ts'
import { errorMessage } from '../backend/log.ts'
import { executionMatch, extractSql } from './score.ts'

const { values: args } = parseArgs({
  options: {
    model: { type: 'string' },
    'base-url': { type: 'string', default: 'https://inference.baseten.co/v1' },
    label: { type: 'string' },
    limit: { type: 'string', default: '300' },
    concurrency: { type: 'string', default: '8' },
  },
})
const model = args.model
const key = process.env.BASETEN_API_KEY
if (!model) throw new Error('--model is required')
if (!key) throw new Error('BASETEN_API_KEY is required')

type Example = { id: number; sql_complexity: string; question: string; context: string; sql: string }
const examples: Example[] = (await Bun.file('eval/data/heldout.jsonl').text())
  .trim()
  .split('\n')
  .map(line => JSON.parse(line))
  .slice(0, Number(args.limit))
const meta: unknown = await Bun.file('eval/data/heldout.meta.json').json()

type Outcome = {
  id: number
  complexity: string
  match: boolean
  error?: string
  sql: string
  latencyMs: number
  promptTokens: number
  completionTokens: number
}

async function ask(example: Example): Promise<Outcome> {
  const started = performance.now()
  const base = { id: example.id, complexity: example.sql_complexity }
  try {
    const res = await fetch(`${args['base-url']}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: buildMessages(schemaOnly(example.context), example.question), max_tokens: 512, temperature: 0 }),
      signal: AbortSignal.timeout(120_000),
    })
    const latencyMs = Math.round(performance.now() - started)
    if (!res.ok)
      return {
        ...base,
        match: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
        sql: '',
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
      }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const sql = extractSql(body.choices?.[0]?.message?.content ?? '')
    return {
      ...base,
      ...executionMatch(example.context, example.sql, sql),
      sql,
      latencyMs,
      promptTokens: body.usage?.prompt_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
    }
  } catch (err) {
    return {
      ...base,
      match: false,
      error: errorMessage(err),
      sql: '',
      latencyMs: Math.round(performance.now() - started),
      promptTokens: 0,
      completionTokens: 0,
    }
  }
}

const outcomes: Outcome[] = []
let next = 0
await Promise.all(
  Array.from({ length: Number(args.concurrency) }, async () => {
    while (next < examples.length) {
      const example = examples[next++]
      if (example) outcomes.push(await ask(example))
      if (outcomes.length % 25 === 0) console.log(`${outcomes.length}/${examples.length}`)
    }
  }),
)

const pct = (p: number): number => {
  const sorted = outcomes.map(o => o.latencyMs).sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
}
const accuracy = (list: Outcome[]): number => Math.round((1000 * list.filter(o => o.match).length) / Math.max(1, list.length)) / 10
const byComplexity = Object.fromEntries(
  [...new Set(outcomes.map(o => o.complexity))].map(c => {
    const group = outcomes.filter(o => o.complexity === c)
    return [c, { n: group.length, accuracy: accuracy(group) }]
  }),
)
const summary = {
  model,
  baseUrl: args['base-url'],
  promptVersion: PROMPT_VERSION,
  heldout: meta,
  n: outcomes.length,
  accuracy: accuracy(outcomes),
  httpErrors: outcomes.filter(o => o.error?.startsWith('HTTP') || o.error?.includes('timed out')).length,
  latencyMs: { p50: pct(0.5), p90: pct(0.9) },
  tokens: { prompt: outcomes.reduce((s, o) => s + o.promptTokens, 0), completion: outcomes.reduce((s, o) => s + o.completionTokens, 0) },
  byComplexity,
  date: new Date().toISOString().slice(0, 10),
}
mkdirSync('eval/results', { recursive: true })
const label = args.label ?? model.replaceAll('/', '_')
await Bun.write(`eval/results/${label}-${summary.date}.json`, JSON.stringify({ summary, outcomes: outcomes.sort((a, b) => a.id - b.id) }, null, 2) + '\n')
console.log(summary)
