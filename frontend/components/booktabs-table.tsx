import { keyframes } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { RULE, SERIF, SIZE } from '../theme.ts'

export type Column = { label: string; align?: 'left' | 'right' }

/** The one authored motion: a table's top rule is drawn across as its result lands. */
const drawRule = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`

const cell = { fontSize: SIZE.small, py: 0.75, px: 1.25, borderBottom: 'none', '&:first-of-type': { pl: 0 }, '&:last-of-type': { pr: 0 } }

/**
 * A table set the way papers set them: caption above ("Table 3. …"), heavy top and bottom rules,
 * a thin rule under the head, no vertical lines. Scrolls inside `maxHeight` with the head pinned.
 */
export function BooktabsTable({
  n,
  caption,
  columns,
  rows,
  maxHeight,
  selected,
  onSelect,
  rowLabel,
  rowSx,
  headBg = 'background.default',
}: {
  n?: number
  caption?: React.ReactNode
  columns: Column[]
  rows: React.ReactNode[][]
  maxHeight?: number
  selected?: number
  onSelect?: (index: number) => void
  rowLabel?: (index: number) => string
  rowSx?: object[]
  /** The ground the table sits on, so the pinned head matches it. */
  headBg?: string
}): React.JSX.Element {
  return (
    <Box component="figure" sx={{ m: 0 }}>
      {caption ? (
        <Typography component="figcaption" variant="body2" sx={{ mb: 0.75, color: 'text.secondary' }}>
          {n === undefined ? null : (
            <Box component="span" sx={{ fontFamily: SERIF, fontWeight: 600, color: 'text.primary', mr: 0.75 }}>
              Table {n}.
            </Box>
          )}
          {caption}
        </Typography>
      ) : null}
      <Box sx={{ position: 'relative', maxHeight, overflow: 'auto', borderBottom: RULE.heavy, borderColor: 'text.primary' }}>
        <Box
          aria-hidden
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            height: RULE.heavy,
            bgcolor: 'text.primary',
            transformOrigin: 'left',
            animation: `${drawRule} 420ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        />
        <Table size="small" stickyHeader sx={{ minWidth: 'max-content', width: '100%' }}>
          <TableHead>
            <TableRow>
              {columns.map(c => (
                <TableCell
                  key={c.label}
                  align={c.align}
                  sx={{
                    ...cell,
                    top: RULE.heavy,
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: SIZE.small,
                    whiteSpace: 'nowrap',
                    bgcolor: headBg,
                    boxShadow: theme => `inset 0 -${RULE.light}px 0 ${theme.palette.text.primary}`,
                  }}
                >
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                hover={Boolean(onSelect)}
                selected={selected === i}
                onClick={onSelect ? () => onSelect(i) : undefined}
                onKeyDown={onSelect ? e => (e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), onSelect(i)) : undefined) : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-selected={onSelect ? selected === i : undefined}
                aria-label={rowLabel?.(i)}
                sx={{ height: 32, cursor: onSelect ? 'pointer' : undefined, ...rowSx?.[i] }}
              >
                {row.map((value, j) => (
                  <TableCell key={j} align={columns[j]?.align} sx={{ ...cell, whiteSpace: 'nowrap' }}>
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
