import { memo, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { MODEL_LABELS, type Turn } from '../lib/turns.ts'
import { COLD_START_HINT_MS } from '../theme.ts'
import { ResultsTable } from './results-table.tsx'
import { SqlBlock } from './sql-block.tsx'

function Pending(): React.JSX.Element {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), COLD_START_HINT_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <Stack spacing={1}>
      <LinearProgress aria-label="Writing SQL" />
      <Typography variant="caption" color="text.secondary">
        {slow ? 'Waking the model up. After a quiet spell it scales to zero, so the first question can take up to a minute.' : 'Writing SQL…'}
      </Typography>
    </Stack>
  )
}

/** One question and its answer: SQL, results and how long the model took, or an error with the SQL it rejected. */
export const TurnRow = memo(function TurnRow({ turn }: { turn: Turn }): React.JSX.Element {
  const { result, error } = turn
  return (
    <Stack spacing={1.5}>
      <Box sx={{ alignSelf: 'flex-end', maxWidth: '85%', bgcolor: 'primary.main', color: 'primary.contrastText', px: 2, py: 1, borderRadius: 2 }}>
        <Typography>{turn.question}</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary">
            {MODEL_LABELS[turn.model]}
            {result ? ` · ${(result.latencyMs / 1000).toFixed(2)} s · ${result.rows.length}${result.truncated ? '+' : ''} rows` : ''}
          </Typography>
          {turn.status === 'pending' ? <Pending /> : null}
          {result ? (
            <>
              <SqlBlock sql={result.sql} />
              <ResultsTable columns={result.columns} rows={result.rows} />
              {result.truncated ? (
                <Typography variant="caption" color="text.secondary">
                  Showing the first {result.rows.length} rows.
                </Typography>
              ) : null}
            </>
          ) : null}
          {error ? (
            <>
              <Alert severity={error.code === 'rate_limited' || error.code === 'budget_exhausted' ? 'warning' : 'error'}>{error.message}</Alert>
              {error.sql ? <SqlBlock sql={error.sql} /> : null}
            </>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  )
})
