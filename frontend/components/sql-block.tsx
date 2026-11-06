import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { MONO } from '../theme.ts'

/** The generated SQL, as text, with a copy button. */
export function SqlBlock({ sql }: { sql: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = (): void => {
    navigator.clipboard.writeText(sql).then(
      () => setCopied(true),
      () => undefined,
    )
  }
  return (
    <Box sx={{ position: 'relative', bgcolor: 'action.hover', borderRadius: 1, p: 1.5, pr: 6 }}>
      <Box component="pre" sx={{ m: 0, fontFamily: MONO, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {sql}
      </Box>
      <Tooltip title={copied ? 'Copied' : 'Copy SQL'}>
        <IconButton size="small" onClick={copy} onMouseLeave={() => setCopied(false)} aria-label="Copy SQL" sx={{ position: 'absolute', top: 6, right: 6 }}>
          <Box component="span" aria-hidden sx={{ fontSize: 14, lineHeight: 1 }}>
            {copied ? '✓' : '⧉'}
          </Box>
        </IconButton>
      </Tooltip>
    </Box>
  )
}
