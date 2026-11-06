import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { DbInfo } from '../../backend/types.ts'
import { MONO } from '../theme.ts'

/** The tables the model can see, collapsed by default. */
export function SchemaPanel({ db }: { db: DbInfo }): React.JSX.Element {
  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary aria-controls="schema-content" id="schema-header">
        <Typography variant="body2">
          {db.tables.length} tables in {db.name}: {db.tables.map(t => t.name).join(', ')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails id="schema-content">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
          {db.tables.map(t => (
            <Box key={t.name}>
              <Typography variant="subtitle2">{t.name}</Typography>
              <Typography variant="caption" sx={{ fontFamily: MONO, color: 'text.secondary' }}>
                {t.columns.join(', ')}
              </Typography>
            </Box>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
