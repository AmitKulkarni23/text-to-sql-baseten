import { useState } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import type { DbInfo } from '../../backend/types.ts'
import { EVAL_N, EVAL_NOTE, EVAL_ROWS } from '../lib/eval-summary.ts'
import { MODEL_COLOR, MONO, SIZE } from '../theme.ts'
import { BooktabsTable } from './booktabs-table.tsx'
import { ModelName } from './model-dot.tsx'

const maxP50 = Math.max(...EVAL_ROWS.map(r => r.p50))

/** Table 1: the held-out results that the rest of the page lets you check by hand. */
function EvalTable(): React.JSX.Element {
  const best = Math.max(...EVAL_ROWS.map(r => r.accuracy))
  return (
    <Box>
      <BooktabsTable
        n={1}
        caption={`Execution accuracy on ${EVAL_N} held-out questions, and median latency.`}
        columns={[{ label: 'Model' }, { label: 'Acc. %', align: 'right' }, { label: 'P50', align: 'right' }]}
        rows={EVAL_ROWS.map(r => [
          <ModelName key="m" model={r.model} label={r.label} />,
          <Box key="a" component="span" sx={{ fontWeight: r.accuracy === best ? 700 : 400 }}>
            {r.accuracy.toFixed(1)}
          </Box>,
          <Box key="l" component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              component="span"
              aria-hidden
              sx={{ display: 'inline-block', width: 24 * (r.p50 / maxP50), height: 6, bgcolor: MODEL_COLOR[r.model], opacity: 0.85 }}
            />
            {r.p50} ms
          </Box>,
        ])}
      />
      {EVAL_NOTE ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
          {EVAL_NOTE}
        </Typography>
      ) : null}
    </Box>
  )
}

/** Every table and column the model is shown; a table opens to its columns. */
function Schema({ db }: { db: DbInfo }): React.JSX.Element {
  const [open, setOpen] = useState<string>()
  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 0.75 }}>
        Schema
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        {db.name}. The model sees these tables and columns, never the rows.
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}>
        {db.tables.map(t => (
          <Box component="li" key={t.name} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <ButtonBase
              onClick={() => setOpen(o => (o === t.name ? undefined : t.name))}
              aria-expanded={open === t.name}
              sx={{ width: '100%', justifyContent: 'space-between', py: 0.75, fontSize: SIZE.small, borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Box component="span" sx={{ fontFamily: MONO, fontSize: SIZE.small }}>
                {t.name}
              </Box>
              <Box component="span" sx={{ color: 'text.secondary', fontSize: SIZE.small }}>
                {t.columns.length} cols
              </Box>
            </ButtonBase>
            <Collapse in={open === t.name} unmountOnExit>
              <Typography variant="body2" sx={{ fontFamily: MONO, fontSize: SIZE.small, color: 'text.secondary', pb: 1, lineHeight: 1.7 }}>
                {t.columns.join(', ')}
              </Typography>
            </Collapse>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/** Left column on wide screens; above the thread on narrow ones. */
export function SidePanel({ db }: { db?: DbInfo }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <EvalTable />
      {db ? <Schema db={db} /> : null}
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Qwen2.5-Coder-1.5B-Instruct with a LoRA adapter trained on{' '}
        <Box component="span" sx={{ fontFamily: MONO, fontSize: SIZE.small }}>
          gretelai/synthetic_text_to_sql
        </Box>
        , served by vLLM on one L4 GPU on Baseten. Queries run read-only.
      </Typography>
    </Box>
  )
}
