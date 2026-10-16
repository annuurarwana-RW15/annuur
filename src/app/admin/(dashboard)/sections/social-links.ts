export interface SocialRow {
  label: string
  url: string
}

const URL_RE = /^(https?:\/\/|\/)/

/** Contoh platform untuk datalist — input label tetap bebas (manual). */
export const SOCIAL_PLATFORMS = [
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'X',
  'WhatsApp',
  'Telegram',
  'Website',
] as const

/**
 * Toleran terhadap bentuk lama: array `{label,url}` (kanonik) maupun string[]
 * (URL telanjang). Item rusak (null/bukan objek) diabaikan; baris objek
 * dipertahankan meski label & url masih kosong agar editor bisa
 * menampilkan baris baru yang belum terisi.
 */
export function parseSocialLinks(raw: string): SocialRow[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const rows: SocialRow[] = []
  for (const item of parsed) {
    if (typeof item === 'string') {
      const url = item.trim()
      if (url) rows.push({ label: '', url })
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      rows.push({ label, url })
    }
  }
  return rows
}

/**
 * Validasi sebelum disimpan ke `content.social`:
 * - JSON harus array
 * - baris terisi-salah-satu wajib lengkap (label & url)
 * - url wajib http(s):// atau path `/…`
 * - baris kosong-total dibuang
 */
export function normalizeSocialLinks(
  parsed: unknown,
): { ok: true; rows: SocialRow[] } | { ok: false; error: string } {
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'harus berupa array' }
  }

  const rows: SocialRow[] = []
  for (const [index, item] of parsed.entries()) {
    const no = index + 1
    if (typeof item === 'string') {
      const url = item.trim()
      if (!url) continue
      if (!URL_RE.test(url)) {
        return { ok: false, error: `baris ${no}: URL tidak valid` }
      }
      rows.push({ label: '', url })
      continue
    }
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `baris ${no}: harus objek { label, url }` }
    }

    const record = item as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label.trim() : ''
    const url = typeof record.url === 'string' ? record.url.trim() : ''
    if (!label && !url) continue
    if (!label) {
      return { ok: false, error: `baris ${no}: nama wajib diisi` }
    }
    if (!url) {
      return { ok: false, error: `baris ${no}: URL wajib diisi` }
    }
    if (!URL_RE.test(url)) {
      return {
        ok: false,
        error: `baris ${no}: URL tidak valid (awali http(s):// atau /…)`,
      }
    }
    rows.push({ label, url })
  }

  return { ok: true, rows }
}
