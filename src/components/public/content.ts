export function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
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
