import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { MONO, SIZE } from '../theme.ts'
import { CheckIcon, CopyIcon } from './icons.tsx'

/** The generated SQL, the thing being judged: monospace on a faint ground, with copy. */
export function SqlBlock({ sql }: { sql: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = (): void => {
    navigator.clipboard.writeText(sql).then(
      () => setCopied(true),
      () => undefined,
    )
  }
  return (
    <Box sx={{ position: 'relative', bgcolor: 'action.hover', borderRadius: 1, py: 1.25, pl: 1.75, pr: 6 }}>
      <Box component="pre" sx={{ m: 0, fontFamily: MONO, fontSize: SIZE.small, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {sql}
      </Box>
      <Tooltip title={copied ? 'Copied' : 'Copy SQL'}>
        <IconButton
          size="small"
          onClick={copy}
          onMouseLeave={() => setCopied(false)}
          aria-label="Copy SQL"
          sx={{ position: 'absolute', top: 6, right: 6, color: 'text.secondary' }}
        >
          {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}
