import { describe, expect, it } from 'vitest'
import {
  formatDateID,
  formatRupiah,
  formatRupiahCompact,
  parseRupiah,
} from '@/lib/format'

describe('formatRupiah', () => {
  it('formatRupiah(1234500) === "Rp 1.234.500"', () => {
    expect(formatRupiah(1234500)).toBe('Rp 1.234.500')
  })
})

describe('formatRupiahCompact', () => {
  it('format ringkas untuk sumbu chart (rb / jt / M)', () => {
    expect(formatRupiahCompact(500)).toBe('500')
    expect(formatRupiahCompact(1234)).toBe('1 rb')
    expect(formatRupiahCompact(1_234_000)).toBe('1,2 jt')
    expect(formatRupiahCompact(2_500_000_000)).toBe('2,5 M')
  })

  it('mendukung angka negatif dan input string', () => {
    expect(formatRupiahCompact(-1_234_000)).toBe('-1,2 jt')
    expect(formatRupiahCompact('1234567')).toBe('1,2 jt')
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
