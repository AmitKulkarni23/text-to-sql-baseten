import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputBase from '@mui/material/InputBase'
import Typography from '@mui/material/Typography'
import type { ModelChoice } from '../../backend/types.ts'
import { SIZE } from '../theme.ts'
import { SendIcon } from './icons.tsx'
import { ModelName } from './model-dot.tsx'

const MAX_QUESTION = 500

/** The question field. Enter asks, Shift+Enter adds a line. Says which model will answer. */
export function AskBox({
  onAsk,
  onFocus,
  disabled,
  model,
}: {
  onAsk: (question: string) => void
  onFocus: () => void
  disabled: boolean
  model: ModelChoice
}): React.JSX.Element {
  const [question, setQuestion] = useState('')
  const submit = (): void => {
    const q = question.trim()
    if (!q || disabled) return
    onAsk(q)
    setQuestion('')
  }
  return (
    <Box
      component="form"
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.default',
        '&:focus-within': { borderColor: 'text.primary' },
        transition: 'border-color 120ms',
      }}
    >
      <InputBase
        fullWidth
        multiline
        maxRows={5}
        placeholder="Ask a question about the data, e.g. which genres earn the most?"
        inputProps={{ 'aria-label': 'Question' }}
        value={question}
        onFocus={onFocus}
        onChange={e => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        sx={{ px: 1.75, pt: 1.5, pb: 0.5, fontSize: SIZE.body, '& textarea::placeholder': { color: 'text.secondary', opacity: 1 } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, pb: 1.25, pl: 1.75 }}>
        <Typography variant="body2" component="span" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>
          <ModelName model={model} /> answers. {question.length > 400 ? `${MAX_QUESTION - question.length} characters left.` : 'Enter to ask.'}
        </Typography>
        <Button type="submit" variant="contained" endIcon={<SendIcon fontSize="small" />} disabled={disabled || !question.trim()}>
          Ask
        </Button>
      </Box>
    </Box>
  )
}
