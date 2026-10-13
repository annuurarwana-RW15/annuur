import { describe, expect, it } from 'vitest'
import { jumatItems, testimoniItems } from '@/components/public/content'

describe('jumatItems', () => {
  it('memetakan array objek valid', () => {
    const out = jumatItems([
      { tanggal: '2026-10-16', khatib: 'Ust. Ahmad Fauzi', imam: 'Ust. Abdul Rahman' },
      { tanggal: '2026-10-23', khatib: 'Ust. Muhammad Siddiq' },
    ])
    expect(out).toEqual([
      { tanggal: '2026-10-16', khatib: 'Ust. Ahmad Fauzi', imam: 'Ust. Abdul Rahman' },
      { tanggal: '2026-10-23', khatib: 'Ust. Muhammad Siddiq', imam: '' },
    ])
  })

  it('melewati entri tanpa tanggal atau khatib', () => {
    const out = jumatItems([
      { tanggal: '2026-10-16', khatib: 'Ust. A' },
      { tanggal: '', khatib: 'Ust. B' },
      { tanggal: '2026-10-23' },
      { khatib: 'Ust. C' },
      'bukan-objek',
      null,
    ])
    expect(out).toHaveLength(1)
    expect(out[0].khatib).toBe('Ust. A')
  })

  it('non-array → []', () => {
    expect(jumatItems(null)).toEqual([])
    expect(jumatItems({})).toEqual([])
    expect(jumatItems('x')).toEqual([])
  })
})

describe('testimoniItems', () => {
  it('memetakan array objek valid dengan rating', () => {
    const out = testimoniItems([
      { nama: 'Budi', peran: 'Jamaah', teks: 'Masjidnya nyaman.', rating: 5 },
      { nama: 'Siti', teks: 'Donasi mudah.', rating: 4 },
    ])
    expect(out).toEqual([
      { nama: 'Budi', peran: 'Jamaah', teks: 'Masjidnya nyaman.', rating: 5 },
      { nama: 'Siti', peran: '', teks: 'Donasi mudah.', rating: 4 },
    ])
  })

  it('rating di luar 1–5 atau tidak numerik → null', () => {
    const out = testimoniItems([
      { nama: 'A', teks: 'Teks A', rating: 9 },
      { nama: 'B', teks: 'Teks B', rating: 'bagus' },
      { nama: 'C', teks: 'Teks C', rating: '3' },
      { nama: 'D', teks: 'Teks D' },
    ])
    expect(out.map((i) => i.rating)).toEqual([null, null, 3, null])
  })

  it('melewati entri tanpa nama atau teks', () => {
    const out = testimoniItems([
      { nama: '', teks: 'Hanya teks' },
      { nama: 'X', teks: '' },
      { nama: 'Y', teks: 'Valid' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].nama).toBe('Y')
  })

  it('non-array → []', () => {
    expect(testimoniItems(undefined)).toEqual([])
    expect(testimoniItems('x')).toEqual([])
  })
})
