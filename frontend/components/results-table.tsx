import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

function cell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

/** Query results; scrolls inside a fixed height so long results don't push the thread. */
export function ResultsTable({ columns, rows }: { columns: string[]; rows: unknown[][] }): React.JSX.Element {
  if (rows.length === 0) return <Typography color="text.secondary">The query ran and returned no rows.</Typography>
  return (
    <TableContainer sx={{ maxHeight: 320, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map(c => (
              <TableCell key={c} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((value, j) => (
                <TableCell key={j} sx={{ color: value === null ? 'text.secondary' : undefined }}>
                  {cell(value)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
