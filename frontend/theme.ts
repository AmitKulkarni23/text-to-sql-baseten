import { createTheme } from '@mui/material/styles'
import type { ModelChoice } from '../backend/types.ts'

/**
 * The page is typeset like a results section of an ML paper: white paper, black ink, booktabs rules,
 * captions in a journal serif, and each model in the colour matplotlib would plot it in.
 * Every colour and size used by a component lives here.
 */

/** matplotlib's default cycle (C0, C1, C2). Used only to identify a model: dots, bars, selection. */
export const MODEL_COLOR: Record<ModelChoice, string> = { tuned: '#1F77B4', base: '#FF7F0E', frontier: '#2CA02C' }
/** The same colours as space-separated RGB channels, for MUI's channel variables (selected rows). */
export const MODEL_CHANNEL: Record<ModelChoice, string> = { tuned: '31 119 180', base: '255 127 14', frontier: '44 160 44' }

/** The journal serif: captions, table heads, the wordmark. STIX Two is what many journals set in. */
export const SERIF = '"STIX Two Text", "STIX Two", Charter, Cambria, Georgia, serif'
export const SANS = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
/** Code and measured numbers only. A named stack, because a bare `monospace` makes browsers shrink the text. */
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** The only three sizes on the page. */
export const SIZE = { small: 13, body: 15, title: 20 } as const

/** Booktabs: heavy top and bottom rules, a thin mid rule, never a vertical line. */
export const RULE = { heavy: 1.5, light: 0.75 } as const

/** The ink bar across the top, in both schemes. */
export const BAR = { bg: '#121418', text: '#F4F5F7', textChannel: '244 245 247', muted: '#A3A9B3', line: '#2A2E35' } as const

export const BAR_HEIGHT = 56
export const SIDE_WIDTH = 344
export const MAIN_MAX = 820

/** After this long a pending answer says the model is probably cold-starting. */
export const COLD_START_HINT_MS = 8000

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-color-scheme' },
  colorSchemes: {
    light: {
      palette: {
        background: { default: '#FFFFFF', paper: '#F5F6F8' },
        divider: '#D9DCE1',
        text: { primary: '#15171B', secondary: '#555B66' },
        primary: { main: '#15171B', contrastText: '#FFFFFF' },
        error: { main: '#B42318' },
        warning: { main: '#9A5B00' },
        action: { hover: 'rgba(21, 23, 27, 0.045)', selected: 'rgba(21, 23, 27, 0.08)' },
      },
    },
    dark: {
      palette: {
        background: { default: '#16181C', paper: '#1C1F24' },
        divider: '#30343B',
        text: { primary: '#ECEEF1', secondary: '#A3A9B3' },
        primary: { main: '#ECEEF1', contrastText: '#16181C' },
        error: { main: '#F97066' },
        warning: { main: '#F5B547' },
        action: { hover: 'rgba(236, 238, 241, 0.06)', selected: 'rgba(236, 238, 241, 0.10)' },
      },
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: SANS,
    fontSize: 14,
    body1: { fontSize: SIZE.body, lineHeight: 1.55 },
    body2: { fontSize: SIZE.small, lineHeight: 1.5 },
    caption: { fontSize: SIZE.small, lineHeight: 1.45 },
    h1: { fontFamily: SERIF, fontSize: SIZE.title, fontWeight: 600, lineHeight: 1.2 },
    h2: { fontFamily: SERIF, fontSize: SIZE.body, fontWeight: 600, lineHeight: 1.35 },
    button: { textTransform: 'none', fontWeight: 600, fontSize: SIZE.small },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
        '::selection': { background: 'rgba(120, 128, 140, 0.32)' },
        'textarea, input': { caretColor: 'currentColor' },
        '*': { scrollbarWidth: 'thin' },
        ':focus-visible': { outline: '2px solid var(--mui-palette-text-primary)', outlineOffset: 2 },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 6, paddingInline: 14 } } },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
  },
})
