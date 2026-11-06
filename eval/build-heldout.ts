/**
 * One-off: builds eval/data/heldout.jsonl, the fixed held-out set. Never rerun once results exist
 * (training.rules.md). Input: the test split at REVISION, converted to eval/data/raw/test.jsonl:
 *   curl -L -o eval/data/raw/test.parquet https://huggingface.co/datasets/gretelai/synthetic_text_to_sql/resolve/<REVISION>/synthetic_text_to_sql_test.snappy.parquet
 *   uv run --no-project --with pyarrow python -c "import pyarrow.parquet as pq, json; open('eval/data/raw/test.jsonl','w').writelines(json.dumps(r)+'\n' for r in pq.read_table('eval/data/raw/test.parquet').to_pylist())"
 * Usage: bun eval/build-heldout.ts
 *
 * Takes the dataset's test split only, keeps read-only questions whose context and gold SQL run in SQLite
 * and return at least one row, and samples 300 with a fixed seed.
 */
import { mkdirSync } from 'node:fs'
import { run } from './score.ts'

const DATASET = 'gretelai/synthetic_text_to_sql'
const REVISION = '740ab236e64503fba51be1101df7a1be83bf455d'
const SEED = 20261105
const COUNT = 300
function str(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`row ${String(row.id)}: ${key} is not a string`)
  return value
}

/** mulberry32: a tiny seeded PRNG, so the sample is the same on every machine. */
function random(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const raw = await Bun.file('eval/data/raw/test.jsonl').text()
const rows: Record<string, unknown>[] = raw
  .trim()
  .split('\n')
  .map(line => JSON.parse(line))
const usable = rows.filter(row => {
  const sql = str(row, 'sql')
  if (row.sql_task_type !== 'analytics and reporting' || !/^\s*(select|with)\b/i.test(sql)) return false
  try {
    return run(str(row, 'sql_context'), sql).length > 0
  } catch {
    return false // gold SQL in another dialect (e.g. MySQL date functions): not scorable in SQLite
  }
})
const total = rows.length

const rand = random(SEED)
for (let i = usable.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1))
  ;[usable[i], usable[j]] = [usable[j] as Record<string, unknown>, usable[i] as Record<string, unknown>]
}
const sample = usable.slice(0, COUNT).map(row => ({
  id: row.id,
  domain: row.domain,
  sql_complexity: row.sql_complexity,
  question: str(row, 'sql_prompt'),
  context: str(row, 'sql_context'),
  sql: str(row, 'sql'),
}))

mkdirSync('eval/data', { recursive: true })
await Bun.write('eval/data/heldout.jsonl', sample.map(row => JSON.stringify(row)).join('\n') + '\n')
const meta = {
  dataset: DATASET,
  revision: REVISION,
  split: 'test',
  seed: SEED,
  testRows: total,
  usable: usable.length,
  count: sample.length,
  built: new Date().toISOString().slice(0, 10),
}
await Bun.write('eval/data/heldout.meta.json', JSON.stringify(meta, null, 2) + '\n')
console.log(meta)
