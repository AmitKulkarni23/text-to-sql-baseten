import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon'

/** Drawn icons, one 1.75 stroke, 24px grid. */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function CopyIcon(props: SvgIconProps): React.JSX.Element {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" {...stroke} />
      <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" {...stroke} />
    </SvgIcon>
  )
}

export function CheckIcon(props: SvgIconProps): React.JSX.Element {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} />
    </SvgIcon>
  )
}

/** Three bars: run the same question on every model. */
export function CompareIcon(props: SvgIconProps): React.JSX.Element {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M4.5 7h11M4.5 12h15M4.5 17h7" {...stroke} />
    </SvgIcon>
  )
}

export function SendIcon(props: SvgIconProps): React.JSX.Element {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" {...stroke} />
    </SvgIcon>
  )
}
