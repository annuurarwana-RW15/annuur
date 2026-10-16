export interface TestimoniRow {
  nama: string
  peran: string
  teks: string
  rating: number | null
}

/**
 * Toleran terhadap data lama: baris objek dipertahankan meski isinya masih
 * kosong (agar tampil di editor); item non-objek diabaikan; rating di-luar
 * 1–5 dianggap `null`.
 */
export function parseTestimoniItems(raw: string): TestimoniRow[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const rows: TestimoniRow[] = []
  for (const item of parsed) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
      const rawRating = record.rating
      const ratingNum =
        typeof rawRating === 'number' ? rawRating : Number(text(rawRating))
      const rating =
        Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5
          ? ratingNum
          : null
      rows.push({
        nama: text(record.nama),
        peran: text(record.peran),
        teks: text(record.teks),
        rating,
      })
    }
  }
  return rows
}

/**
 * Validasi sebelum disimpan ke `content.items`:
 * - wajib array; `nama` + `teks` wajib; `peran` opsional; `rating` int 1–5 atau null
 * - baris kosong-total dibuang
 */
export function normalizeTestimoniItems(
  parsed: unknown,
): { ok: true; rows: TestimoniRow[] } | { ok: false; error: string } {
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'harus berupa array' }
  }

  const rows: TestimoniRow[] = []
  for (const [index, item] of parsed.entries()) {
    const no = index + 1
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `baris ${no}: harus objek { nama, teks }` }
    }
    const record = item as Record<string, unknown>
    const nama = typeof record.nama === 'string' ? record.nama.trim() : ''
    const peran = typeof record.peran === 'string' ? record.peran.trim() : ''
    const teks = typeof record.teks === 'string' ? record.teks.trim() : ''
    if (!nama && !peran && !teks && record.rating == null) continue
    if (!nama) {
      return { ok: false, error: `baris ${no}: nama wajib diisi` }
    }
    if (!teks) {
      return { ok: false, error: `baris ${no}: teks testimoni wajib diisi` }
    }

    const rawRating = record.rating
    let rating: number | null = null
    if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
      const ratingNum =
        typeof rawRating === 'number' ? rawRating : Number(String(rawRating).trim())
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return { ok: false, error: `baris ${no}: rating harus bilangan bulat 1–5` }
      }
      rating = ratingNum
    }

    rows.push({ nama, peran, teks, rating })
  }

  return { ok: true, rows }
}
