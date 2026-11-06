import Box from '@mui/material/Box'
import type { ModelChoice } from '../../backend/types.ts'
import { MODEL_LABELS } from '../lib/turns.ts'
import { MODEL_COLOR } from '../theme.ts'

/** A model's plot colour followed by its name, the way a legend entry reads. */
export function ModelName({ model, label = MODEL_LABELS[model] }: { model: ModelChoice; label?: string }): React.JSX.Element {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
      <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MODEL_COLOR[model], flexShrink: 0 }} />
      {label}
    </Box>
  )
}
