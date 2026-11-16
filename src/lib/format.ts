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

/**
 * Format string input rupiah dengan pemisah ribuan titik (id-ID) saat penulisan/pengetikan.
 * Mendukung input dengan awalan Rp, angka mentah, titik ribuan, dan koma desimal.
 * Contoh: "50000000" → "50.000.000", "12500000,50" → "12.500.000,50"
 */
export function formatCurrencyInput(val: string | number | null | undefined): string {
  if (val === '' || val === null || val === undefined) return ''
  const str = String(val).replace(/rp/i, '').trim()
  if (!str) return ''
  const parts = str.split(',')
  const intDigits = parts[0].replace(/\D/g, '')
  if (!intDigits && parts.length === 1) return ''
  const formattedInt = intDigits ? new Intl.NumberFormat('id-ID').format(Number(intDigits)) : '0'
  if (parts.length > 1) {
    const decDigits = parts[1].replace(/\D/g, '').slice(0, 2)
    return `${formattedInt},${decDigits}`
  }
  return formattedInt
}

/**
 * Parsing string mata uang rupiah berformat titik ribuan dan/atau koma desimal ke number.
 * Contoh: "50.000.000" → 50000000, "12.500.000,50" → 12500000.5
 */
export function parseCurrencyInput(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const str = String(val)
    .replace(/rp/i, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const n = Number(str)
  return isNaN(n) ? 0 : n
}

