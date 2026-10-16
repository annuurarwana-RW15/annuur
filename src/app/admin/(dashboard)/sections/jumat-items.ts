export interface JumatRow {
  tanggal: string
  khatib: string
  imam: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  )
}

/**
 * Toleran terhadap data lama: baris objek dipertahankan meski isinya masih
 * kosong (agar tampil di editor); item non-objek diabaikan.
 */
export function parseJumatItems(raw: string): JumatRow[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const rows: JumatRow[] = []
  for (const item of parsed) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
      rows.push({
        tanggal: text(record.tanggal),
        khatib: text(record.khatib),
        imam: text(record.imam),
      })
    }
  }
  return rows
}

/**
 * Validasi sebelum disimpan ke `content.items`:
 * - wajib array; `tanggal` format YYYY-MM-DD valid; `khatib` wajib; `imam` opsional
 * - baris kosong-total dibuang
 */
export function normalizeJumatItems(
  parsed: unknown,
): { ok: true; rows: JumatRow[] } | { ok: false; error: string } {
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'harus berupa array' }
  }

  const rows: JumatRow[] = []
  for (const [index, item] of parsed.entries()) {
    const no = index + 1
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `baris ${no}: harus objek { tanggal, khatib, imam }` }
    }
    const record = item as Record<string, unknown>
    const tanggal = typeof record.tanggal === 'string' ? record.tanggal.trim() : ''
    const khatib = typeof record.khatib === 'string' ? record.khatib.trim() : ''
    const imam = typeof record.imam === 'string' ? record.imam.trim() : ''
    if (!tanggal && !khatib && !imam) continue
    if (!tanggal) {
      return { ok: false, error: `baris ${no}: tanggal wajib diisi (YYYY-MM-DD)` }
    }
    if (!isValidIsoDate(tanggal)) {
      return { ok: false, error: `baris ${no}: tanggal tidak valid (format YYYY-MM-DD)` }
    }
    if (!khatib) {
      return { ok: false, error: `baris ${no}: khotib wajib diisi` }
    }
    rows.push({ tanggal, khatib, imam })
  }

  return { ok: true, rows }
}
