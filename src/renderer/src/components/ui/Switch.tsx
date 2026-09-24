interface Props {
  on: boolean
  onToggle: (next: boolean) => void
  disabled?: boolean
}

export default function Switch({ on, onToggle, disabled }: Props): JSX.Element {
  return (
    <button
      type="button"
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => !disabled && onToggle(!on)}
      disabled={disabled}
      aria-pressed={on}
    />
  )
}
