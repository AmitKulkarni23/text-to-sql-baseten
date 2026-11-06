import { memo, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { MODEL_LABELS, type Run, sameRows, type Turn } from '../lib/turns.ts'
import { COLD_START_HINT_MS, MODEL_COLOR, SERIF, SIZE } from '../theme.ts'
import { BooktabsTable } from './booktabs-table.tsx'
import { CompareIcon } from './icons.tsx'
import { ModelName } from './model-dot.tsx'
import { SqlBlock } from './sql-block.tsx'

function cell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

const seconds = (ms: number): string => `${(ms / 1000).toFixed(2)} s`

function Pending({ run }: { run: Run }): React.JSX.Element {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), COLD_START_HINT_MS)
    return () => clearTimeout(timer)
  }, [])
  const waking = run.waking || slow
  return (
    <Stack spacing={1} role="status">
      <LinearProgress
        aria-label={`${MODEL_LABELS[run.model]} is writing SQL`}
        sx={{ height: 2, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: MODEL_COLOR[run.model] } }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {waking
          ? 'Waking the model. It scales to zero when nobody is using it, so the first question after a quiet spell takes a few minutes; this one will be answered as soon as it is up.'
          : `${MODEL_LABELS[run.model]} is writing SQL…`}
      </Typography>
    </Stack>
  )
}

/** One model's answer: its SQL, then the rows as a table, or a plain account of what went wrong. */
function RunView({ run, n }: { run: Run; n?: number }): React.JSX.Element {
  if (run.status === 'pending') return <Pending run={run} />
  if (run.status === 'error' || !run.result) {
    const limited = run.error?.code === 'rate_limited' || run.error?.code === 'budget_exhausted'
    return (
      <Stack spacing={1.25}>
        <Typography variant="body2" role="alert" sx={{ color: limited ? 'warning.main' : 'error.main' }}>
          <Box component="span" sx={{ fontFamily: SERIF, fontWeight: 600, mr: 0.75 }}>
            {limited ? 'Paused.' : 'Error.'}
          </Box>
          {run.error?.message ?? 'Something went wrong.'}
        </Typography>
        {run.error?.sql ? <SqlBlock sql={run.error.sql} /> : null}
      </Stack>
    )
  }
  const { result } = run
  return (
    <Stack spacing={1.75}>
      <SqlBlock sql={result.sql} />
      {result.rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          The query ran and returned no rows.
        </Typography>
      ) : (
        <BooktabsTable
          n={n}
          caption={
            <>
              Rows returned by <ModelName model={run.model} /> in {seconds(result.latencyMs)}
              {result.truncated ? `; the first ${result.rows.length} are shown.` : '.'}
            </>
          }
          maxHeight={340}
          columns={result.columns.map((label, i) => ({ label, align: typeof result.rows[0]?.[i] === 'number' ? 'right' : 'left' }))}
          rows={result.rows.map(row => row.map(cell))}
        />
      )}
    </Stack>
  )
}

/** The same question across models: who agrees with the fine-tuned answer, and who was fastest. Rows select which answer shows below. */
function Comparison({ turn, n, selected, onSelect }: { turn: Turn; n: number; selected: number; onSelect: (i: number) => void }): React.JSX.Element {
  const reference = turn.runs.find(r => r.model === 'tuned')?.result
  const done = turn.runs.filter(r => r.result).map(r => r.result?.latencyMs ?? Infinity)
  const fastest = done.length > 1 ? Math.min(...done) : undefined
  return (
    <BooktabsTable
      n={n}
      caption="The same question, asked of each model. Select a row to see its SQL and rows."
      columns={[{ label: 'Model' }, { label: 'Rows', align: 'right' }, { label: 'Same rows as fine-tuned' }, { label: 'Latency', align: 'right' }]}
      selected={selected}
      onSelect={onSelect}
      rowLabel={i => `Show the answer from ${MODEL_LABELS[turn.runs[i]?.model ?? 'tuned']}`}
      rows={turn.runs.map(r => [
        <ModelName key="m" model={r.model} />,
        r.result ? `${r.result.rows.length}${r.result.truncated ? '+' : ''}` : '—',
        r.status === 'pending'
          ? r.waking
            ? 'waking…'
            : 'running…'
          : r.status === 'error'
            ? r.error?.code === 'sql_error' || r.error?.code === 'unsafe_sql'
              ? 'query failed'
              : 'no answer'
            : r.model === 'tuned' || !reference || !r.result
              ? '—'
              : sameRows(reference, r.result)
                ? 'yes'
                : 'no',
        r.result ? (
          <Box key="l" component="span" sx={{ fontWeight: r.result.latencyMs === fastest ? 700 : 400 }}>
            {seconds(r.result.latencyMs)}
          </Box>
        ) : (
          '—'
        ),
      ])}
    />
  )
}

/** Query N: the question, then one answer, or a comparison table over several. */
export const TurnRow = memo(function TurnRow({
  turn,
  n,
  canCompare,
  onCompare,
}: {
  turn: Turn
  n: number
  canCompare: boolean
  onCompare: (turn: Turn) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState(0)
  const run = turn.runs[Math.min(selected, turn.runs.length - 1)]
  const compared = turn.runs.length > 1
  return (
    <Box component="article" aria-label={`Query ${turn.id}`} sx={{ pt: 3, borderTop: 1, borderColor: 'divider', '&:first-of-type': { pt: 0, borderTop: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: '1 1 320px', fontSize: SIZE.body }}>
          <Box component="span" sx={{ fontFamily: SERIF, fontWeight: 600, mr: 1 }}>
            Query {turn.id}.
          </Box>
          {turn.question}
        </Typography>
        {!compared ? (
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
            <ModelName model={turn.runs[0]?.model ?? 'tuned'} />
          </Typography>
        ) : null}
        {canCompare ? (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<CompareIcon fontSize="small" />}
            onClick={() => onCompare(turn)}
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
          >
            Compare models
          </Button>
        ) : null}
      </Box>
      <Stack spacing={2.5}>
        {compared ? <Comparison turn={turn} n={n} selected={selected} onSelect={setSelected} /> : null}
        {run ? <RunView run={run} n={compared ? undefined : n} /> : null}
      </Stack>
    </Box>
  )
})
