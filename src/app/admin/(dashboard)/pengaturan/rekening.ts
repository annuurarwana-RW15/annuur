export interface RekeningRow {
  bank: string
  no: string
  atasNama: string
  link?: string
}

/** Saran nama bank untuk datalist — input tetap bebas. */
export const BANK_LIST = [
  'BSI',
  'Bank Mandiri',
  'BCA',
  'BRI',
  'BNI',
  'Muamalat',
  'BTN',
  'CIMB Niaga',
] as const

/**
 * Toleran terhadap data lama: terima `{bank,no,atasNama}` maupun kunci legacy
 * `a.n.`; baris objek dipertahankan meski masih kosong (agar tampil di editor).
 */
export function parseRekening(value: unknown): RekeningRow[] {
  if (!Array.isArray(value)) return []

  const rows: RekeningRow[] = []
  for (const item of value) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const text = (key: string) => {
        const v = record[key]
        return typeof v === 'string' ? v.trim() : ''
      }
      const atasNama = text('atasNama') || text('a.n.')
      rows.push({
        bank: text('bank'),
        no: text('no'),
        atasNama,
        link: text('link'),
      })
    }
  }
  return rows
}

/**
 * Validasi sebelum disimpan ke setting `donasi.rekening`:
 * - wajib array; `bank` + `no` wajib; `atasNama`/`link` opsional
 * - baris kosong-total dibuang; `link` kosong dibuang dari output
 */
export function normalizeRekening(
  parsed: unknown,
): { ok: true; rows: RekeningRow[] } | { ok: false; error: string } {
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'harus berupa array' }
  }

  const rows: RekeningRow[] = []
  for (const [index, item] of parsed.entries()) {
    const no = index + 1
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `baris ${no}: harus objek { bank, no, atasNama }` }
    }
    const record = item as Record<string, unknown>
    const text = (key: string) => {
      const v = record[key]
      return typeof v === 'string' ? v.trim() : ''
    }
    const bank = text('bank')
    const rekeningNo = text('no')
    const atasNama = text('atasNama') || text('a.n.')
    const link = text('link')
    if (!bank && !rekeningNo && !atasNama && !link) continue
    if (!bank) {
      return { ok: false, error: `baris ${no}: nama bank wajib diisi` }
    }
    if (!rekeningNo) {
      return { ok: false, error: `baris ${no}: nomor rekening wajib diisi` }
    }
    rows.push({ bank, no: rekeningNo, atasNama, ...(link ? { link } : {}) })
  }

  return { ok: true, rows }
}
