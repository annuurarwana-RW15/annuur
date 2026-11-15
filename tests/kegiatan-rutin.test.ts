import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEGIATAN_RUTIN,
  normalizeKegiatanRutinList,
  HARI_LABELS,
  KATEGORI_KEGIATAN_LABELS,
} from '@/lib/kegiatan-rutin'

describe('kegiatan-rutin utils', () => {
  it('DEFAULT_KEGIATAN_RUTIN memiliki kegiatan rutin lengkap dengan hari dan waktu', () => {
    expect(DEFAULT_KEGIATAN_RUTIN.length).toBeGreaterThanOrEqual(4)
    for (const item of DEFAULT_KEGIATAN_RUTIN) {
      expect(item.nama).toBeTruthy()
      expect(item.waktu).toBeTruthy()
      expect(HARI_LABELS[item.hari]).toBeTruthy()
      expect(KATEGORI_KEGIATAN_LABELS[item.kategori]).toBeTruthy()
      expect(item.urutan).toBeGreaterThan(0)
    }
  })

  it('normalizeKegiatanRutinList membersihkan input dan mengurutkan berdasarkan urutan', () => {
    const raw = [
      {
        id: 'kr-2',
        nama: ' Kajian Fiqih ',
        hari: 'kamis',
        waktu: ' Ba\'da Maghrib ',
        kategori: 'kajian_umum',
        urutan: 5,
      },
      {
        id: 'kr-1',
        nama: ' TPQ Sore ',
        hari: 'senin',
        waktu: '16:00 WIB',
        kategori: 'anak_tpq',
        urutan: 2,
      },
      {
        nama: '', // invalid nama
      },
    ]

    const result = normalizeKegiatanRutinList(raw)
    expect(result).toHaveLength(2)
    expect(result[0].nama).toBe('TPQ Sore')
    expect(result[0].hari).toBe('SENIN')
    expect(result[0].kategori).toBe('ANAK_TPQ')
    expect(result[1].nama).toBe('Kajian Fiqih')
    expect(result[1].hari).toBe('KAMIS')
    expect(result[1].waktu).toBe('Ba\'da Maghrib')
  })
})
