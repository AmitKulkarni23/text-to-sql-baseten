import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

/** Placeholder until the chat lands in TASK-008. */
export default function App(): React.JSX.Element {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1">
        TextToSQL
      </Typography>
      <Typography color="text.secondary">Ask a database a question in plain English.</Typography>
    </Container>
  )
}
