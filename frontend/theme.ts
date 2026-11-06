import { createTheme } from '@mui/material/styles'

/** Code text. A named stack, because a bare `monospace` makes browsers shrink the text. */
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** Width of the reading column; the results table may scroll sideways inside it. */
export const COLUMN = 880

/** After this long a pending answer says the model is probably cold-starting. */
export const COLD_START_HINT_MS = 8000

/** The one MUI theme: cool neutrals, teal accent, light and dark follow the system. */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-color-scheme' },
  colorSchemes: {
    dark: {
      palette: {
        background: { default: '#0E1113', paper: '#161A1D' },
        divider: '#262C30',
        text: { primary: '#E6EAEC', secondary: '#9AA4AA' },
        primary: { main: '#3CC6B4', contrastText: '#0E1113' },
      },
    },
    light: {
      palette: {
        background: { default: '#F6F8F8', paper: '#FFFFFF' },
        divider: '#DDE3E5',
        text: { primary: '#14191B', secondary: '#58636A' },
        primary: { main: '#0F7F72', contrastText: '#FFFFFF' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    body1: { fontSize: 15, lineHeight: 1.5 },
    caption: { fontSize: 12, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' },
  },
})
