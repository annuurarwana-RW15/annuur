export function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function safeHref(value: string): string | null {
  const url = value.trim()
  if (!url) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    return SAFE_PROTOCOLS.has(parsed.protocol) ? url : null
  } catch {
    return null
  }
}

export interface GalleryItem {
  url: string
  caption: string
}

export function galleryItems(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) return []

  const items: GalleryItem[] = []
  for (const raw of value) {
    if (typeof raw === 'string') {
      const url = raw.trim()
      if (url) items.push({ url, caption: '' })
      continue
    }
    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>
      const url = asText(record.url)
      if (url) items.push({ url, caption: asText(record.caption) })
    }
  }
  return items
}

export interface SocialLink {
  label: string
  url: string
}

export function socialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return []

  const links: SocialLink[] = []
  for (const raw of value) {
    if (typeof raw === 'string') {
      const url = raw.trim()
      if (url) links.push({ label: url, url })
      continue
    }
    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>
      const url = asText(record.url)
      if (url) links.push({ label: asText(record.label, url), url })
    }
  }
  return links
}

export interface JumatItem {
  tanggal: string
  khatib: string
  imam: string
}

/** Normalisasi daftar jadwal khotib Jumat: wajib `tanggal` + `khatib`, `imam` opsional. */
export function jumatItems(value: unknown): JumatItem[] {
  if (!Array.isArray(value)) return []

  const items: JumatItem[] = []
  for (const raw of value) {
    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>
      const tanggal = asText(record.tanggal)
      const khatib = asText(record.khatib)
      if (tanggal && khatib) {
        items.push({ tanggal, khatib, imam: asText(record.imam) })
      }
    }
  }
  return items
}

export interface TestimoniItem {
  nama: string
  peran: string
  teks: string
  rating: number | null
}

/** Normalisasi daftar testimoni: wajib `nama` + `teks`; `peran`/`rating` opsional (rating 1–5). */
export function testimoniItems(value: unknown): TestimoniItem[] {
  if (!Array.isArray(value)) return []

  const items: TestimoniItem[] = []
  for (const raw of value) {
    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>
      const nama = asText(record.nama)
      const teks = asText(record.teks)
      if (!nama || !teks) continue

      const ratingNum =
        typeof record.rating === 'number' ? record.rating : Number(asText(record.rating))
      const rating =
        Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null

      items.push({ nama, peran: asText(record.peran), teks, rating })
    }
  }
  return items
}
