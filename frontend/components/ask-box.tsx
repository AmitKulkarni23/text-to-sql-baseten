import { useState } from 'react'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

const MAX_QUESTION = 500

/** The question input. Enter sends, Shift+Enter adds a line. */
export function AskBox({ onAsk, disabled }: { onAsk: (question: string) => void; disabled: boolean }): React.JSX.Element {
  const [question, setQuestion] = useState('')
  const submit = (): void => {
    const q = question.trim()
    if (!q || disabled) return
    onAsk(q)
    setQuestion('')
  }
  return (
    <Stack
      component="form"
      direction="row"
      spacing={1}
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        label="Ask a question about the data"
        value={question}
        onChange={e => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <Button type="submit" variant="contained" disabled={disabled || !question.trim()} sx={{ flexShrink: 0 }}>
        Ask
      </Button>
    </Stack>
  )
}
