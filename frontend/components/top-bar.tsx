import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { DbInfo, ModelChoice } from '../../backend/types.ts'
import { MODEL_LABELS, MODEL_SHORT } from '../lib/turns.ts'
import { BAR, BAR_HEIGHT, MODEL_COLOR, SIZE } from '../theme.ts'

/** Ink bar: wordmark, the database being asked, and which model answers next. */
export function TopBar({
  db,
  models,
  model,
  onModel,
}: {
  db?: DbInfo
  models: ModelChoice[]
  model: ModelChoice
  onModel: (m: ModelChoice) => void
}): React.JSX.Element {
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: BAR.bg, color: BAR.text, borderBottom: 1, borderColor: BAR.line }}>
      <Box sx={{ minHeight: BAR_HEIGHT, px: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1 }}>
        <Typography variant="h1" component="h1" sx={{ letterSpacing: '-0.01em' }}>
          TextToSQL
        </Typography>
        {db ? (
          <Typography sx={{ fontSize: SIZE.small, color: BAR.muted, display: { xs: 'none', sm: 'block' } }}>
            {db.name} · {db.tables.length} tables · read-only
          </Typography>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {models.length > 0 ? (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={model}
            onChange={(_, m: ModelChoice | null) => (m ? onModel(m) : undefined)}
            aria-label="Model that answers"
            // The selected state reads MUI's text-primary variable; inside the ink bar that has to be the bar's own text colour.
            sx={{ bgcolor: BAR.wash, '--mui-palette-text-primary': BAR.text, '--mui-palette-text-primaryChannel': BAR.textChannel }}
          >
            {models.map(m => (
              <ToggleButton
                key={m}
                value={m}
                sx={{
                  color: BAR.muted,
                  borderColor: BAR.line,
                  px: 1.5,
                  py: 0.5,
                  fontSize: SIZE.small,
                  textTransform: 'none',
                  gap: 0.75,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: BAR.hover, color: BAR.text },
                }}
              >
                <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MODEL_COLOR[m] }} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {MODEL_LABELS[m]}
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  {MODEL_SHORT[m]}
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        ) : null}
      </Box>
    </Box>
  )
}
