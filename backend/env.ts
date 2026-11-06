import { createComplete } from './baseten.ts'
import { loadConfig, type Config } from './config.ts'
import { createHandlers, type Handlers } from './handlers.ts'

let config: Config | undefined

/** The handlers wired to process.env and the real Baseten client. Shared by api/*.ts and dev.ts. */
export const handlers: Handlers = createHandlers(() => (config ??= loadConfig(process.env)), createComplete)
