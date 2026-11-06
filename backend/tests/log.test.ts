import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { errorMessage, log } from '../log.ts'

describe('log', () => {
  let lines: string[]
  let spy: ReturnType<typeof spyOn>
  beforeEach(() => {
    lines = []
    spy = spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line))
  })
  afterEach(() => spy.mockRestore())

  describe('when a field tries to override level or event', () => {
    it('should keep the logger level and event when fields collide', () => {
      log.warn('baseten_timeout', { level: 'debug', event: 'spoofed', latencyMs: 55000 })
      const line: unknown = JSON.parse(lines[0] ?? '')
      expect(line).toMatchObject({ level: 'warn', event: 'baseten_timeout', latencyMs: 55000 })
    })
  })

  describe('when running in production without LOG_LEVEL=debug', () => {
    it('should drop debug lines when the level is off and keep them when it is on', () => {
      const saved = { NODE_ENV: process.env.NODE_ENV, LOG_LEVEL: process.env.LOG_LEVEL }
      process.env.NODE_ENV = 'production'
      delete process.env.LOG_LEVEL
      log.debug('ask_started', { dbId: 'chinook' })
      process.env.LOG_LEVEL = 'debug'
      log.debug('ask_started', { dbId: 'chinook' })
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      expect(lines).toHaveLength(1)
    })
  })

  describe('when errorMessage gets a non-Error value', () => {
    it('should return the message for an Error and a string otherwise', () => {
      expect(errorMessage(new Error('no such table: Invoice'))).toBe('no such table: Invoice')
      expect(errorMessage(429)).toBe('429')
    })
  })
})
