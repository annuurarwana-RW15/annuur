import { describe, expect, it } from 'vitest'
import {
  normalizeTestimoniItems,
  parseTestimoniItems,
} from '@/app/admin/(dashboard)/sections/testimoni-items'

describe('parseTestimoniItems', () => {
  it('membaca array objek lama, rating di-luar 1–5 → null', () => {
    const rows = parseTestimoniItems(
      JSON.stringify([
        { nama: 'Ahmad', peran: 'Jamaah', teks: 'Bagus', rating: 5 },
        { nama: 'Siti', peran: '', teks: 'Nyaman', rating: 9 },
        { nama: 'Zain', peran: '', teks: 'Tenang', rating: '4' },
      ]),
    )
    expect(rows).toEqual([
      { nama: 'Ahmad', peran: 'Jamaah', teks: 'Bagus', rating: 5 },
      { nama: 'Siti', peran: '', teks: 'Nyaman', rating: null },
      { nama: 'Zain', peran: '', teks: 'Tenang', rating: 4 },
    ])
  })

  it('JSON rusak / bukan array → []', () => {
    expect(parseTestimoniItems('[')).toEqual([])
    expect(parseTestimoniItems('{}')).toEqual([])
  })

  it('baris objek kosong dipertahankan; non-objek diabaikan', () => {
    expect(
      parseTestimoniItems(
        JSON.stringify([null, { nama: '', peran: '', teks: '', rating: null }]),
      ),
    ).toEqual([{ nama: '', peran: '', teks: '', rating: null }])
  })
})

describe('normalizeTestimoniItems', () => {
  it('array valid → rows siap simpan; rating string numerik diterima', () => {
    expect(
      normalizeTestimoniItems([
        { nama: ' Ahmad ', peran: ' Jamaah ', teks: ' Mantap ', rating: 5 },
        { nama: 'Siti', peran: '', teks: 'Lurus', rating: '3' },
        { nama: 'Zain', peran: '', teks: 'Damai', rating: '' },
      ]),
    ).toEqual({
      ok: true,
      rows: [
        { nama: 'Ahmad', peran: 'Jamaah', teks: 'Mantap', rating: 5 },
        { nama: 'Siti', peran: '', teks: 'Lurus', rating: 3 },
        { nama: 'Zain', peran: '', teks: 'Damai', rating: null },
      ],
    })
  })

  it('baris kosong-total dibuang', () => {
    expect(
      normalizeTestimoniItems([
        { nama: '', peran: '', teks: '', rating: null },
        { nama: 'Ahmad', peran: '', teks: 'Mantap', rating: null },
      ]),
    ).toEqual({
      ok: true,
      rows: [{ nama: 'Ahmad', peran: '', teks: 'Mantap', rating: null }],
    })
  })

  it('menolak nama/teks kosong dan rating di luar 1–5', () => {
    expect(normalizeTestimoniItems([{ nama: '', teks: 'Mantap' }])).toEqual({
      ok: false,
      error: 'baris 1: nama wajib diisi',
    })
    expect(normalizeTestimoniItems([{ nama: 'Ahmad', teks: '' }])).toEqual({
      ok: false,
      error: 'baris 1: teks testimoni wajib diisi',
    })
    expect(normalizeTestimoniItems([{ nama: 'Ahmad', teks: 'Mantap', rating: 0 }])).toEqual({
      ok: false,
      error: 'baris 1: rating harus bilangan bulat 1–5',
    })
    expect(
      normalizeTestimoniItems([{ nama: 'Ahmad', teks: 'Mantap', rating: 2.5 }]),
    ).toEqual({
      ok: false,
      error: 'baris 1: rating harus bilangan bulat 1–5',
    })
  })

  it('menolak non-array', () => {
    expect(normalizeTestimoniItems('bukan')).toEqual({
      ok: false,
      error: 'harus berupa array',
    })
  })
})
