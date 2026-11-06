import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { DbsResponse, ModelChoice } from '../backend/types.ts'
import { AskBox } from './components/ask-box.tsx'
import { SchemaPanel } from './components/schema-panel.tsx'
import { TurnRow } from './components/turn-row.tsx'
import { useAsk } from './hooks/use-ask.ts'
import { fetchDbs } from './lib/api.ts'
import { MODEL_LABELS } from './lib/turns.ts'
import { COLUMN } from './theme.ts'

const EXAMPLES = [
  'Which 5 artists have the most albums?',
  'What is the total revenue per country, highest first?',
  'Which employee supports the most customers?',
  'List the 10 longest tracks in the Rock genre.',
]

export default function App(): React.JSX.Element {
  const [config, setConfig] = useState<DbsResponse | { error: string }>()
  const [model, setModel] = useState<ModelChoice>('tuned')
  const { turns, send, busy } = useAsk()
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchDbs(controller.signal).then(
      dbs => {
        setConfig(dbs)
        if (dbs.models[0]) setModel(dbs.models[0])
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setConfig({ error: err instanceof Error ? err.message : 'Could not load the databases.' })
      },
    )
    return () => controller.abort()
  }, [])

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [turns.length])

  const db = config && 'dbs' in config ? config.dbs[0] : undefined
  const models = config && 'models' in config ? config.models : []
  const ask = (question: string): void => {
    if (db) send({ dbId: db.id, question, model })
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1.5 }}>
        <Box sx={{ maxWidth: COLUMN, mx: 'auto' }}>
          <Typography variant="h6" component="h1">
            TextToSQL
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask a database a question in plain English. A 1.5B model fine-tuned for SQL writes the query, and it runs read-only.
          </Typography>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1, width: '100%', maxWidth: COLUMN, mx: 'auto', px: 2, py: 2 }}>
        {config === undefined ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress aria-label="Loading" />
          </Stack>
        ) : 'error' in config ? (
          <Alert severity="error">{config.error}</Alert>
        ) : !db ? (
          <Alert severity="warning">No databases are available.</Alert>
        ) : (
          <Stack spacing={2}>
            <SchemaPanel db={db} />
            {models.length === 0 ? (
              <Alert severity="info">No model is connected yet, so questions are turned off.</Alert>
            ) : (
              <ToggleButtonGroup exclusive size="small" value={model} onChange={(_, m: ModelChoice | null) => m && setModel(m)} aria-label="Model">
                {models.map(m => (
                  <ToggleButton key={m} value={m} sx={{ textTransform: 'none', px: 1.5 }}>
                    {MODEL_LABELS[m]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
            {turns.length === 0 && models.length > 0 ? (
              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
                {EXAMPLES.map(q => (
                  <Chip key={q} label={q} variant="outlined" onClick={() => ask(q)} />
                ))}
              </Stack>
            ) : null}
            {turns.map(t => (
              <TurnRow key={t.id} turn={t} />
            ))}
            <div ref={end} />
          </Stack>
        )}
      </Box>

      <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider', px: 2, py: 1.5 }}>
        <Box sx={{ maxWidth: COLUMN, mx: 'auto' }}>
          <AskBox onAsk={ask} disabled={!db || models.length === 0 || busy} />
        </Box>
      </Box>
    </Box>
  )
}
