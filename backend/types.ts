/** Request and response shapes shared by the API and the frontend. */

/** `tuned`: the fine-tuned 1.5B. `base`: the same model before fine-tuning. `frontier`: a large Model APIs model. */
export type ModelChoice = 'tuned' | 'base' | 'frontier'

export type AskRequest = { dbId: string; question: string; model: ModelChoice }

export type AskResponse = {
  model: ModelChoice
  sql: string
  columns: string[]
  rows: unknown[][]
  truncated: boolean
  latencyMs: number
}

export type DbInfo = { id: string; name: string; tables: { name: string; columns: string[] }[] }

export type DbsResponse = { dbs: DbInfo[]; models: ModelChoice[] }

export type ErrorCode =
  'bad_request' | 'unsafe_sql' | 'sql_error' | 'rate_limited' | 'budget_exhausted' | 'model_unavailable' | 'model_timeout' | 'config_error'

/** `sql` is set when the model answered but the query was rejected or failed, so the user can see it. */
export type ApiError = { error: { code: ErrorCode; message: string; sql?: string } }
