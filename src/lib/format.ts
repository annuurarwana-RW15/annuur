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
