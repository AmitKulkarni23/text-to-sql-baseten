import { createTheme } from '@mui/material/styles'

/** The one MUI theme: light and dark follow the system. Shared colours and sizes go here, never in components. */
export const theme = createTheme({
  colorSchemes: { light: true, dark: true },
  typography: { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
})
