import { handlers } from '../backend/env.ts'

export const POST = (req: Request): Promise<Response> => handlers.ask(req)
