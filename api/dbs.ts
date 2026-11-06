import { handlers } from '../backend/env.ts'

export const GET = (): Response => handlers.dbs()
