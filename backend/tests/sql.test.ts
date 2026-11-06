import { describe, expect, it } from 'bun:test'
import { MAX_ROWS, rejectReason, runQuery, schemaFor } from '../sql.ts'

describe('sql', () => {
  describe('when the model returns something other than one SELECT', () => {
    it.each([
      ['DROP TABLE Track', 'Only SELECT queries can run.'],
      ['DELETE FROM Invoice WHERE Total > 10', 'Only SELECT queries can run.'],
      ['PRAGMA table_info(Track)', 'Only SELECT queries can run.'],
      ["ATTACH DATABASE '/tmp/x.db' AS x", 'Only SELECT queries can run.'],
      ['SELECT * FROM Track; DROP TABLE Track', 'Only one statement can run at a time.'],
      ['SELECT 1 /* ; */; DELETE FROM Track', 'Only one statement can run at a time.'],
      ['WITH t AS (SELECT 1) DELETE FROM Track', 'The query contains a statement that is not allowed.'],
      ["SELECT load_extension('evil')", 'The query contains a statement that is not allowed.'],
      ['', 'The model did not return a query.'],
    ])('should reject %p when it is not a single read-only query', (sql, reason) => {
      expect(rejectReason(sql)).toBe(reason)
    })
  })

  describe('when the model returns a single read-only query', () => {
    it('should allow SELECT and WITH when there is one trailing semicolon or a comment', () => {
      expect(rejectReason('SELECT Name FROM Artist LIMIT 5;')).toBeUndefined()
      expect(rejectReason('-- top artists\nWITH c AS (SELECT ArtistId FROM Album) SELECT COUNT(*) FROM c')).toBeUndefined()
    })

    it('should cap rows and flag truncation when the result is larger than the limit', () => {
      const result = runQuery('chinook', 'SELECT TrackId, Name FROM Track ORDER BY TrackId;')
      expect(result.rows).toHaveLength(MAX_ROWS)
      expect(result.truncated).toBe(true)
      expect(result.rows[0]).toEqual([1, 'For Those About To Rock (We Salute You)'])
    })

    it('should keep both columns when two have the same name', () => {
      const result = runQuery(
        'chinook',
        'SELECT ar.Name, t.Name FROM Artist ar JOIN Album al ON al.ArtistId = ar.ArtistId JOIN Track t ON t.AlbumId = al.AlbumId LIMIT 1',
      )
      expect(result.columns).toEqual(['Name', 'Name:1'])
    })
  })

  describe('when a write slips past the guard', () => {
    it('should fail because the database is read-only and the query is wrapped as a subquery', () => {
      expect(() => runQuery('chinook', 'DELETE FROM Track')).toThrow()
      expect(runQuery('chinook', 'SELECT COUNT(*) FROM Track').rows).toEqual([[3503]])
    })
  })

  describe('when building the prompt schema', () => {
    it('should list every table as a compact CREATE TABLE when the database is known', () => {
      expect(schemaFor('chinook')).toContain('CREATE TABLE Album (AlbumId INTEGER, Title NVARCHAR(160), ArtistId INTEGER);')
      expect(schemaFor('../etc/passwd')).toBeUndefined()
    })
  })
})
