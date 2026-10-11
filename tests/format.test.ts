import { describe, expect, it } from 'vitest'
import { formatDateID, formatRupiah, parseRupiah } from '@/lib/format'

describe('formatRupiah', () => {
  it('formatRupiah(1234500) === "Rp 1.234.500"', () => {
    expect(formatRupiah(1234500)).toBe('Rp 1.234.500')
  })
})

describe('parseRupiah', () => {
  it('parseRupiah("Rp 1.234.500") === 1234500', () => {
    expect(parseRupiah('Rp 1.234.500')).toBe(1234500)
  })
})

describe('roundtrip', () => {
  it.each([0, 1, 999, 1000, 1234500, 987654321])(
    'parseRupiah(formatRupiah(%i)) === %i',
    (x) => {
      expect(parseRupiah(formatRupiah(x))).toBe(x)
    },
  )
})

describe('formatDateID', () => {
  it('formatDateID(11 Okt 2026) === "11 Okt 2026"', () => {
    expect(formatDateID(new Date(2026, 9, 11))).toBe('11 Okt 2026')
  })
})
