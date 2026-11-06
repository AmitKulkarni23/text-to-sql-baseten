import { handlers } from '../backend/env.ts'

export const POST = (): Promise<Response> => handlers.wake()
