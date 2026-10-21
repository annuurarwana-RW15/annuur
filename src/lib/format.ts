const IDR = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const DATE_ID = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatRupiah(n: number | string): string {
  const value = typeof n === 'string' ? parseRupiah(n) : n
  return `Rp ${IDR.format(value)}`
}

/**
 * Format ringkas untuk sumbu chart (angka rupiah bisa sangat besar):
 * "12500000" → "12,5 jt", "2500000000" → "2,5 M".
 */
export function formatRupiahCompact(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  }
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  }
  if (abs >= 1_000) {
    return `${(num / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  }
  return num.toLocaleString('id-ID')
}

export function parseRupiah(s: string): number {
  const normalized = s
    .replace(/rp/i, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const n = Number(normalized)
  return Number.isNaN(n) ? 0 : n
}

export function formatDateID(d: Date): string {
  return DATE_ID.format(d)
}
