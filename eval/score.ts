import { Database } from 'bun:sqlite'
import { errorMessage } from '../backend/log.ts'

export type MatchResult = { match: boolean; error?: string }

/** Pulls the SQL out of a model reply: the body of a ``` fence if there is one, else the trimmed reply. */
export function extractSql(reply: string): string {
  const fenced = /```(?:sql)?\s*([\s\S]*?)```/i.exec(reply)
  return (fenced?.[1] ?? reply).trim()
}

/** Runs one query on a fresh in-memory database built from the example's CREATE TABLE + INSERT context. */
export function run(context: string, sql: string): unknown[][] {
  const db = new Database(':memory:')
  try {
    db.run(context)
    return db.query(sql).values()
  } finally {
    db.close()
  }
}

/** Rounds floats so AVG computed two ways still compares equal; 5 and 5.0 are already the same JS number. */
function rowKey(row: unknown[]): string {
  return JSON.stringify(row.map(v => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)))
}

/**
 * Execution accuracy: gold and predicted SQL each run on their own fresh copy of the context, and match
 * when they return the same rows. Rows are compared as a multiset unless the gold query has ORDER BY.
 * ponytail: column order must match too; Spider-style column permutation matching if that proves too strict.
 */
export function executionMatch(context: string, gold: string, predicted: string): MatchResult {
  if (!predicted.trim()) return { match: false, error: 'empty prediction' }
  const expected = run(context, gold).map(rowKey)
  let actual: string[]
  try {
    actual = run(context, predicted).map(rowKey)
  } catch (err) {
    return { match: false, error: errorMessage(err) }
  }
  if (!/\border\s+by\b/i.test(gold)) {
    expected.sort()
    actual.sort()
  }
  return { match: expected.length === actual.length && expected.every((key, i) => key === actual[i]) }
}
