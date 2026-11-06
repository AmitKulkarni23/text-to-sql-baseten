import { describe, expect, it } from 'bun:test'
import { executionMatch, extractSql } from '../score.ts'

const context =
  "CREATE TABLE creative_ai (application_id INT, name TEXT, region TEXT, explainability_score FLOAT); INSERT INTO creative_ai (application_id, name, region, explainability_score) VALUES (1, 'ApplicationX', 'Europe', 0.87), (2, 'ApplicationY', 'North America', 0.91), (3, 'ApplicationZ', 'Europe', 0.84), (4, 'ApplicationAA', 'North America', 0.93), (5, NULL, 'Asia', 0.5);"

describe('executionMatch', () => {
  describe('when the predicted SQL returns the same rows', () => {
    it('should match when the query text differs but the result is the same', () => {
      const gold = "SELECT AVG(explainability_score) FROM creative_ai WHERE region IN ('Europe', 'North America');"
      const predicted = "SELECT avg(explainability_score) FROM creative_ai WHERE region = 'Europe' OR region = 'North America'"
      expect(executionMatch(context, gold, predicted)).toEqual({ match: true })
    })

    it('should match when rows come back in a different order and the gold has no ORDER BY', () => {
      const gold = "SELECT name FROM creative_ai WHERE region = 'Europe'"
      const predicted = "SELECT name FROM creative_ai WHERE region = 'Europe' ORDER BY name DESC"
      expect(executionMatch(context, gold, predicted).match).toBe(true)
    })

    it('should match when one side returns an integer and the other the same float', () => {
      expect(executionMatch(context, 'SELECT COUNT(*) FROM creative_ai', 'SELECT COUNT(*) * 1.0 FROM creative_ai').match).toBe(true)
    })

    it('should match NULLs with NULLs when both queries return them', () => {
      expect(executionMatch(context, "SELECT name FROM creative_ai WHERE region = 'Asia'", 'SELECT name FROM creative_ai WHERE application_id = 5').match).toBe(
        true,
      )
    })
  })

  describe('when the predicted SQL returns different rows', () => {
    it('should not match when the order differs and the gold has ORDER BY', () => {
      const gold = 'SELECT name FROM creative_ai ORDER BY explainability_score DESC'
      const predicted = 'SELECT name FROM creative_ai ORDER BY explainability_score ASC'
      expect(executionMatch(context, gold, predicted).match).toBe(false)
    })

    it('should not match when a duplicate row is missing', () => {
      const gold = 'SELECT region FROM creative_ai'
      const predicted = 'SELECT DISTINCT region FROM creative_ai'
      expect(executionMatch(context, gold, predicted).match).toBe(false)
    })

    it('should not match when the filter is wrong', () => {
      const gold = "SELECT COUNT(*) FROM creative_ai WHERE region = 'Europe'"
      expect(executionMatch(context, gold, 'SELECT COUNT(*) FROM creative_ai').match).toBe(false)
    })
  })

  describe('when the predicted SQL fails', () => {
    it('should not match and should report the SQLite error when a column does not exist', () => {
      const result = executionMatch(context, 'SELECT name FROM creative_ai', 'SELECT title FROM creative_ai')
      expect(result.match).toBe(false)
      expect(result.error).toContain('no such column')
    })

    it('should not match when the prediction is empty', () => {
      expect(executionMatch(context, 'SELECT name FROM creative_ai', '')).toMatchObject({ match: false, error: 'empty prediction' })
    })

    it('should not let a destructive prediction affect the gold result', () => {
      const result = executionMatch(context, 'SELECT COUNT(*) FROM creative_ai', 'DELETE FROM creative_ai')
      expect(result.match).toBe(false)
    })
  })
})

describe('extractSql', () => {
  describe('when the model wraps the query', () => {
    it('should strip a ```sql code fence when the reply has one', () => {
      expect(extractSql('```sql\nSELECT name FROM creative_ai;\n```')).toBe('SELECT name FROM creative_ai;')
    })

    it('should return the trimmed reply when there is no fence', () => {
      expect(extractSql('  SELECT name FROM creative_ai;\n')).toBe('SELECT name FROM creative_ai;')
    })
  })
})
