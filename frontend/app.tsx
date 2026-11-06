import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import type { DbsResponse, ModelChoice } from '../backend/types.ts'
import { AskBox } from './components/ask-box.tsx'
import { SendIcon } from './components/icons.tsx'
import { SidePanel } from './components/side-panel.tsx'
import { TopBar } from './components/top-bar.tsx'
import { TurnRow } from './components/turn-row.tsx'
import { useAsk } from './hooks/use-ask.ts'
import { fetchDbs, wakeModel } from './lib/api.ts'
import { MODEL_ORDER } from './lib/turns.ts'
import { BAR_HEIGHT, MAIN_MAX, SIDE_WIDTH, SIZE } from './theme.ts'

const EXAMPLES = [
  'Which 5 artists have the most albums?',
  'What is the total revenue per country, highest first?',
  'Which employee supports the most customers?',
  'List the 10 longest tracks in the Rock genre.',
]

export default function App(): React.JSX.Element {
  const [config, setConfig] = useState<DbsResponse | { error: string }>()
  const [model, setModel] = useState<ModelChoice>('tuned')
  const [panelOpen, setPanelOpen] = useState(false)
  const { turns, send, compare } = useAsk()
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchDbs(controller.signal).then(
      dbs => {
        setConfig(dbs)
        if (dbs.models[0] && !dbs.models.includes('tuned')) setModel(dbs.models[0])
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setConfig({ error: err instanceof Error ? err.message : 'Could not load the databases.' })
      },
    )
    return () => controller.abort()
  }, [])

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [turns.length])

  const db = config && 'dbs' in config ? config.dbs[0] : undefined
  const models = config && 'models' in config ? MODEL_ORDER.filter(m => config.models.includes(m)) : []
  const ready = Boolean(db) && models.length > 0
  const ask = (question: string): void => {
    if (db) send({ dbId: db.id, question, model })
  }
  const chooseModel = (m: ModelChoice): void => {
    setModel(m)
    if (m !== 'frontier') wakeModel()
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopBar db={db} models={models} model={model} onModel={chooseModel} />
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: `${SIDE_WIDTH}px 1fr` } }}>
        <Box
          component="aside"
          aria-label="Results and schema"
          sx={{
            bgcolor: 'background.paper',
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: 'divider',
            px: 2.5,
            py: { xs: 1.5, md: 3 },
            position: { md: 'sticky' },
            top: { md: BAR_HEIGHT },
            alignSelf: 'start',
            height: { md: `calc(100dvh - ${BAR_HEIGHT}px)` },
            overflowY: { md: 'auto' },
          }}
        >
          <ButtonBase
            onClick={() => setPanelOpen(o => !o)}
            aria-expanded={panelOpen}
            sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', justifyContent: 'space-between', fontSize: SIZE.small, color: 'text.secondary' }}
          >
            <span>Held-out results and schema</span>
            <span>{panelOpen ? 'Hide' : 'Show'}</span>
          </ButtonBase>
          <Box sx={{ display: { xs: panelOpen ? 'block' : 'none', md: 'block' }, pt: { xs: 2.5, md: 0 } }}>
            <SidePanel db={db} />
          </Box>
        </Box>

        <Box component="main" sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, width: '100%', maxWidth: MAIN_MAX, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 3, pb: 4 }}>
            {config === undefined ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} aria-label="Loading" color="inherit" />
              </Box>
            ) : 'error' in config ? (
              <Alert severity="error">{config.error}</Alert>
            ) : !db ? (
              <Alert severity="warning">No databases are available.</Alert>
            ) : models.length === 0 ? (
              <Alert severity="info">No model is connected yet, so questions are turned off.</Alert>
            ) : turns.length === 0 ? (
              <Box sx={{ maxWidth: 560, pt: { xs: 1, md: 6 } }}>
                <Typography variant="h1" component="h2" sx={{ mb: 1.5 }}>
                  Ask {db.name.split(' (')[0]} a question.
                </Typography>
                <Typography sx={{ color: 'text.secondary', mb: 3 }}>
                  A 1.5B model fine-tuned for SQL writes the query and it runs read-only against the database. Compare any answer with the base model and a
                  frontier model.
                </Typography>
                <Typography variant="h2" component="h3" sx={{ mb: 0.75 }}>
                  Try one
                </Typography>
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}>
                  {EXAMPLES.map(q => (
                    <Box component="li" key={q} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                      <ButtonBase
                        onClick={() => ask(q)}
                        sx={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          py: 1.25,
                          px: 0.5,
                          fontSize: SIZE.body,
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:hover .arrow': { opacity: 1 },
                        }}
                      >
                        <Box component="span" sx={{ flex: 1 }}>
                          {q}
                        </Box>
                        <SendIcon className="arrow" aria-hidden fontSize="small" sx={{ opacity: 0.35, transition: 'opacity 120ms' }} />
                      </ButtonBase>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {turns.map((t, i) => (
                  <TurnRow
                    key={t.id}
                    turn={t}
                    n={i + 2}
                    canCompare={models.some(m => !t.runs.some(r => r.model === m))}
                    onCompare={turn => compare(turn, db.id, models)}
                  />
                ))}
                <div ref={end} />
              </Box>
            )}
          </Box>

          <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1.5 }}>
            <Box sx={{ maxWidth: MAIN_MAX, mx: 'auto' }}>
              <AskBox onAsk={ask} onFocus={() => (model === 'frontier' ? undefined : wakeModel())} disabled={!ready} model={model} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
