/** Local development only: the API handlers plus the frontend, with hot reload. Production is Vercel (api/ + dist/). */
import page from '../frontend/index.html'
import { handlers } from './env.ts'
import { log } from './log.ts'

const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': page,
    '/api/health': () => handlers.health(),
    '/api/dbs': () => handlers.dbs(),
    '/api/ask': { POST: req => handlers.ask(req) },
  },
})
log.info('dev_server_started', { url: server.url.href })
