/**
 * The one prompt, shared by the API, the eval and (mirrored in Python) training/train.py.
 * Bump PROMPT_VERSION in both files whenever the messages change.
 */
export const PROMPT_VERSION = 1

export const SYSTEM_PROMPT = 'You write SQLite queries. Given a database schema and a question, reply with exactly one SQLite SELECT query and nothing else.'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Keeps only the CREATE statements: the model sees the schema, never the rows (the app's databases are too big to inline). */
export function schemaOnly(context: string): string {
  return (context.match(/CREATE\s+(?:TABLE|VIEW)\b[^;]*;/gi) ?? []).join('\n')
}

/** Schema + question → chat messages. `schema` is CREATE statements only. */
export function buildMessages(schema: string, question: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Schema:\n${schema}\n\nQuestion: ${question}` },
  ]
}
