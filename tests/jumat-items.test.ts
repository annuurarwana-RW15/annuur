import { describe, expect, it } from 'vitest'
import {
  normalizeJumatItems,
  parseJumatItems,
} from '@/app/admin/(dashboard)/sections/jumat-items'

describe('parseJumatItems', () => {
  it('membaca array objek lama', () => {
    const rows = parseJumatItems(
      JSON.stringify([{ tanggal: '2026-10-16', khatib: 'Ust. A', imam: 'Ust. B' }]),
    )
    expect(rows).toEqual([{ tanggal: '2026-10-16', khatib: 'Ust. A', imam: 'Ust. B' }])
  })

  it('JSON rusak / bukan array → []', () => {
    expect(parseJumatItems('{oops')).toEqual([])
    expect(parseJumatItems('"x"')).toEqual([])
  })

  it('baris objek kosong dipertahankan (agar tampil di editor); non-objek diabaikan', () => {
    expect(
      parseJumatItems(JSON.stringify([null, 42, { tanggal: '', khatib: '', imam: '' }])),
    ).toEqual([{ tanggal: '', khatib: '', imam: '' }])
  })
})

describe('normalizeJumatItems', () => {
  it('array valid → rows siap simpan (imam boleh kosong)', () => {
    expect(
      normalizeJumatItems([
        { tanggal: ' 2026-10-16 ', khatib: ' Ust. A ', imam: '' },
        { tanggal: '2026-10-23', khatib: 'Ust. B', imam: 'Ust. C' },
      ]),
    ).toEqual({
      ok: true,
      rows: [
        { tanggal: '2026-10-16', khatib: 'Ust. A', imam: '' },
        { tanggal: '2026-10-23', khatib: 'Ust. B', imam: 'Ust. C' },
      ],
    })
  })

  it('baris kosong-total dibuang', () => {
    expect(
      normalizeJumatItems([
        { tanggal: '', khatib: '', imam: '' },
        { tanggal: '2026-10-16', khatib: 'Ust. A', imam: '' },
      ]),
    ).toEqual({
      ok: true,
      rows: [{ tanggal: '2026-10-16', khatib: 'Ust. A', imam: '' }],
    })
  })

  it('menolak tanggal kosong / format salah / tanggal mustahil', () => {
    expect(normalizeJumatItems([{ tanggal: '', khatib: 'Ust. A' }])).toEqual({
      ok: false,
      error: 'baris 1: tanggal wajib diisi (YYYY-MM-DD)',
    })
    expect(normalizeJumatItems([{ tanggal: '16/10/2026', khatib: 'Ust. A' }])).toEqual({
      ok: false,
      error: 'baris 1: tanggal tidak valid (format YYYY-MM-DD)',
    })
    expect(normalizeJumatItems([{ tanggal: '2026-02-30', khatib: 'Ust. A' }])).toEqual({
      ok: false,
      error: 'baris 1: tanggal tidak valid (format YYYY-MM-DD)',
    })
  })

  it('menolak khotib kosong dan non-array', () => {
    expect(normalizeJumatItems([{ tanggal: '2026-10-16', khatib: '' }])).toEqual({
      ok: false,
      error: 'baris 1: khotib wajib diisi',
    })
    expect(normalizeJumatItems({ tanggal: '2026-10-16' })).toEqual({
      ok: false,
      error: 'harus berupa array',
    })
  })
})
