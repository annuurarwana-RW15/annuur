/**
 * Tautan peta (pengganti iframe `MapEmbed`).
 *
 * Embed OpenStreetMap butuh query statis (bbox/koordinat) + parsing teks bebas
 * admin → kompleks tanpa key, jadi memilih link-only (YAGNI). `mapHref` menerima
 * URL lengkap (http/https) apa adanya lewat `safeHref`, selain itu membangun
 * URL pencarian dari teks bebas (koordinat/nama tempat).
 */
import type { ReactNode } from 'react'
import { safeHref } from './content'

export function mapHref(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const direct = safeHref(trimmed)
  if (direct && /^https?:\/\//i.test(direct)) return direct

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
}

export function MapLink({
  query,
  className,
  children = 'Buka di Peta',
}: {
  query: string
  className?: string
  children?: ReactNode
}) {
  const href = mapHref(query)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  )
}
