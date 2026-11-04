/**
 * Tautan dan Sematan Peta Interaktif Google Maps.
 * Mendukung input link Google Maps, kode <iframe> embed, maupun query alamat teks bebas.
 */
import type { ReactNode } from 'react'
import { safeHref } from './content'

/**
 * Ekstrak URL embed dari iframe HTML atau URL langsung.
 */
export function extractEmbedSrc(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Jika input berupa tag <iframe src="...">
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i)
  if (iframeMatch && iframeMatch[1]) {
    const src = iframeMatch[1].trim()
    if (/^https?:\/\//i.test(src)) return src
  }

  // Jika input berupa URL embed Google Maps langsung
  if (
    /^https?:\/\/(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps.*(embed|output=embed)/i.test(
      trimmed,
    )
  ) {
    return trimmed
  }

  return null
}

/**
 * Membangun URL embed Google Maps (zero-API-key) dari alamat atau nama tempat.
 */
export function buildGoogleMapsEmbedUrl(query: string): string | null {
  const clean = query.replace(/<[^>]+>/g, '').trim()
  if (!clean) return null
  return `https://maps.google.com/maps?q=${encodeURIComponent(clean)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
}

/**
 * Menghasilkan tautan Google Maps untuk navigasi pengguna di tab baru/aplikasi Maps.
 */
export function mapHref(query: string, directUrl?: string): string | null {
  if (directUrl) {
    const validDirect = safeHref(directUrl.trim())
    if (validDirect && /^https?:\/\//i.test(validDirect)) {
      return validDirect
    }
  }

  const trimmed = query.trim()
  if (!trimmed) return null

  // Jika query itu sendiri adalah URL
  const direct = safeHref(trimmed)
  if (direct && /^https?:\/\//i.test(direct)) return direct

  // Bersihkan dari tag HTML jika admin sengaja memasukkan iframe di field query
  const clean = trimmed.replace(/<[^>]+>/g, '').trim()
  if (!clean) return null

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`
}

/**
 * Menghasilkan tautan petunjuk arah (Directions) Google Maps ke lokasi masjid.
 */
export function getDirectionsHref(destination: string): string {
  const clean = destination.replace(/<[^>]+>/g, '').trim()
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    clean || 'Masjid An-nuur Arwana',
  )}`
}

export function MapLink({
  query,
  directUrl,
  className,
  children = 'Buka di Google Maps',
}: {
  query: string
  directUrl?: string
  className?: string
  children?: ReactNode
}) {
  const href = mapHref(query, directUrl)
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

export interface GoogleMapEmbedProps {
  mapQuery?: string
  mapUrl?: string
  alamat?: string
  title?: string
  className?: string
}

export function GoogleMapEmbed({
  mapQuery = '',
  mapUrl = '',
  alamat = '',
  title = 'Lokasi Masjid An-nuur Arwana',
  className = '',
}: GoogleMapEmbedProps) {
  // 1. Coba ekstrak embed URL dari input sematan/iframe
  const explicitEmbed = extractEmbedSrc(mapQuery) || extractEmbedSrc(mapUrl)
  // 2. Jika tidak ada embed eksplisit, bangun embed dari alamat / query
  const fallbackQuery = mapQuery.replace(/<[^>]+>/g, '').trim() || alamat.trim()
  const embedUrl =
    explicitEmbed || (fallbackQuery ? buildGoogleMapsEmbedUrl(fallbackQuery) : null)

  const directLink = mapHref(fallbackQuery, mapUrl)
  const destination =
    alamat.trim() ||
    (!fallbackQuery.startsWith('http') ? fallbackQuery : 'Masjid An-nuur Arwana')
  const directionsLink = getDirectionsHref(destination)

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-emas/30 bg-white shadow-sm flex flex-col ${className}`}
    >
      {/* Container Iframe Peta Interaktif */}
      <div className="relative w-full aspect-video min-h-[260px] sm:min-h-[300px] bg-neutral-100">
        {embedUrl ? (
          <iframe
            title={title}
            src={embedUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-hijau-tua/70">
            <span className="text-3xl">🗺️</span>
            <p className="mt-2 text-sm font-medium">
              Peta lokasi Google Maps belum dikonfigurasi.
            </p>
          </div>
        )}
      </div>

      {/* Bar Tombol Aksi Peta */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-neutral-50 px-4 py-3 border-t border-black/5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-hijau-tua min-w-0">
          <span>📍</span>
          <span className="truncate max-w-[200px] sm:max-w-xs">
            {alamat || 'Masjid An-nuur Arwana'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {directLink && (
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-green-800 transition"
              title="Buka lokasi di Google Maps"
            >
              <span>🗺️</span>
              <span>Buka di Google Maps</span>
            </a>
          )}
          {directionsLink && (
            <a
              href={directionsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emas/50 bg-white px-3 py-1.5 text-xs font-semibold text-hijau hover:bg-krem transition"
              title="Dapatkan rute petunjuk arah menuju masjid"
            >
              <span>🧭</span>
              <span>Petunjuk Arah</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
