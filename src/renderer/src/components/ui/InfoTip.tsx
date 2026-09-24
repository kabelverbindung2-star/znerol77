import type { ReactNode } from 'react'

/** Shows `text` in a bubble after hovering (or focusing) the wrapped element for a moment. */
export default function InfoTip({
  text,
  children,
  placement = 'bottom'
}: {
  text: ReactNode
  children: ReactNode
  placement?: 'bottom' | 'top'
}): JSX.Element {
  return (
    <div className={`tip tip-${placement}`}>
      {children}
      <div className="tip-bubble" role="tooltip">
        {text}
      </div>
    </div>
  )
}
