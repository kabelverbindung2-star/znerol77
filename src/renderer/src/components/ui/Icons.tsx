type IconProps = { className?: string }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export const ActivityIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

export const ListIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

export const PowerIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
)

export const ClickIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M9 9l11 4-4.5 2L13 20z" />
    <path d="M9 9L4 4" />
    <path d="M9 4v1" />
    <path d="M4 9h1" />
  </svg>
)

export const VolumeIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

export const GamepadIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <circle cx="15" cy="13" r="1" />
    <circle cx="18" cy="11" r="1" />
    <rect x="2" y="6" width="20" height="12" rx="4" />
  </svg>
)

export const SunIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

export const MoonIcon = ({ className }: IconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
