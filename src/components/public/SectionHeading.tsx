import type { ReactNode } from 'react'

export function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="5.5" y="5.5" width="13" height="13" />
        <rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)" />
      </g>
    </svg>
  )
}

interface SectionHeadingProps {
  id?: string
  children: ReactNode
  light?: boolean
  className?: string
}

export function SectionHeading({
  id,
  children,
  light = false,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2
        id={id}
        className={`font-display text-3xl font-bold leading-tight sm:text-4xl ${
          light ? 'text-krem' : 'text-hijau'
        }`}
      >
        {children}
      </h2>
      <div className="mt-3 flex items-center gap-3 text-emas" aria-hidden="true">
        <StarGlyph />
        <span className="h-px w-24 bg-current opacity-70" />
      </div>
    </div>
  )
}
