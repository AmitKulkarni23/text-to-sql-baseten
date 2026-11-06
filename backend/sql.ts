import { Database } from 'bun:sqlite'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DbInfo } from './types.ts'

const DB_DIR = join(import.meta.dir, 'db')
export const MAX_ROWS = 200

/** Display names; any other file in backend/db/ gets its file name. */
const NAMES: Record<string, string> = { chinook: 'Chinook (music store)' }

type Db = { info: DbInfo; schema: string; db: Database }

/** Opens every database in backend/db/ read-only, once per process. dbId is only ever looked up here, never used in a path. */
function openAll(): Map<string, Db> {
  const dbs = new Map<string, Db>()
  for (const file of readdirSync(DB_DIR)
    .filter(f => f.endsWith('.sqlite'))
    .sort()) {
    const id = file.replace(/\.sqlite$/, '')
    const db = new Database(join(DB_DIR, file), { readonly: true })
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .values()
      .map(([name]) => {
        const columns = db.query(`PRAGMA table_info("${String(name)}")`).all() as { name: string; type: string }[]
        return { name: String(name), columns }
      })
    // Same shape as the training data's context: one compact CREATE TABLE per line, no constraints.
    const schema = tables.map(t => `CREATE TABLE ${t.name} (${t.columns.map(c => `${c.name} ${c.type}`).join(', ')});`).join('\n')
    dbs.set(id, { info: { id, name: NAMES[id] ?? id, tables: tables.map(t => ({ name: t.name, columns: t.columns.map(c => c.name) })) }, schema, db })
  }
  return dbs
}

let cache: Map<string, Db> | undefined
const all = (): Map<string, Db> => (cache ??= openAll())

export function listDbs(): DbInfo[] {
  return [...all().values()].map(d => d.info)
}

/** The prompt schema for a database, or undefined for an unknown id. */
export function schemaFor(dbId: string): string | undefined {
  return all().get(dbId)?.schema
}

/**
 * Returns why `sql` must not run, or undefined if it may. The database is also opened read-only, so this
 * is the second wall, not the only one. It is strict on purpose: a false rejection only costs a rephrase.
 */
export function rejectReason(sql: string): string | undefined {
  const code = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim()
    .replace(/;\s*$/, '')
  if (!code) return 'The model did not return a query.'
  if (code.includes(';')) return 'Only one statement can run at a time.'
  if (!/^(select|with)\b/i.test(code)) return 'Only SELECT queries can run.'
  if (/\b(attach|detach|pragma|load_extension|insert|update|delete|drop|create|alter|vacuum|reindex)\b/i.test(code)) {
    return 'The query contains a statement that is not allowed.'
  }
  return undefined
}

export type QueryResult = { columns: string[]; rows: unknown[][]; truncated: boolean }

/**
 * Runs a checked query. Wrapping it in `SELECT * FROM (…) LIMIT` makes SQLite stop after MAX_ROWS + 1 rows,
 * and SQLite renames duplicate column names (`Name`, `Name:1`) instead of dropping one.
 * ponytail: no per-query time limit (bun:sqlite can't interrupt); a pathological aggregate is cut off by the
 * function's maxDuration. Move execution into a Worker with a 2 s terminate if that ever matters.
 */
export function runQuery(dbId: string, sql: string): QueryResult {
  const entry = all().get(dbId)
  if (!entry) throw new Error(`unknown database ${dbId}`)
  const statement = entry.db.query(`SELECT * FROM (${sql.trim().replace(/;\s*$/, '')}\n) LIMIT ${MAX_ROWS + 1}`)
  const rows = statement.values()
  const columns = statement.columnNames
  statement.finalize()
  return { columns, rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS }
}
