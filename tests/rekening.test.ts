import { describe, expect, it } from 'vitest'
import {
  normalizeRekening,
  parseRekening,
} from '@/app/admin/(dashboard)/pengaturan/rekening'

describe('parseRekening', () => {
  it('membaca bentuk kanonik + legacy a.n.', () => {
    expect(
      parseRekening([
        { bank: 'BCA', no: '123', atasNama: 'DKM', link: 'https://x.example' },
        { bank: 'BRI', no: '456', 'a.n.': 'Masjid' },
      ]),
    ).toEqual([
      { bank: 'BCA', no: '123', atasNama: 'DKM', link: 'https://x.example' },
      { bank: 'BRI', no: '456', atasNama: 'Masjid', link: '' },
    ])
  })

  it('bukan array / item rusak → diabaikan', () => {
    expect(parseRekening({ bank: 'BCA' })).toEqual([])
    expect(parseRekening([null, 7, 'x'])).toEqual([])
  })

  it('baris objek kosong dipertahankan (agar tampil di editor)', () => {
    expect(parseRekening([{ bank: '', no: '', atasNama: '' }])).toEqual([
      { bank: '', no: '', atasNama: '', link: '' },
    ])
  })
})

describe('normalizeRekening', () => {
  it('array valid → rows siap simpan; link kosong dibuang', () => {
    expect(
      normalizeRekening([
        { bank: ' BCA ', no: ' 123 ', atasNama: ' DKM ', link: '' },
        { bank: 'BRI', no: '456', atasNama: '', link: 'https://donasi.example' },
      ]),
    ).toEqual({
      ok: true,
      rows: [
        { bank: 'BCA', no: '123', atasNama: 'DKM' },
        { bank: 'BRI', no: '456', atasNama: '', link: 'https://donasi.example' },
      ],
    })
  })

  it('baris kosong-total dibuang', () => {
    expect(
      normalizeRekening([
        { bank: '', no: '', atasNama: '' },
        { bank: 'BCA', no: '123', atasNama: 'DKM' },
      ]),
    ).toEqual({
      ok: true,
      rows: [{ bank: 'BCA', no: '123', atasNama: 'DKM' }],
    })
  })

  it('menolak bank / nomor kosong dan non-array', () => {
    expect(normalizeRekening([{ bank: '', no: '123' }])).toEqual({
      ok: false,
      error: 'baris 1: nama bank wajib diisi',
    })
    expect(normalizeRekening([{ bank: 'BCA', no: '' }])).toEqual({
      ok: false,
      error: 'baris 1: nomor rekening wajib diisi',
    })
    expect(normalizeRekening('x')).toEqual({ ok: false, error: 'harus berupa array' })
  })
})
