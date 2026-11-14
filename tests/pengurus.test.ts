import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PENGURUS_LIST,
  normalizePengurusList,
} from '@/lib/pengurus'
import {
  findNextFriday,
  formatIsoDate,
  generateJumatSchedule,
} from '@/lib/khotib-generator'

describe('pengurus utils', () => {
  it('DEFAULT_PENGURUS_LIST terstruktur lengkap dengan nama, jabatan, kategori, dan tugas', () => {
    expect(DEFAULT_PENGURUS_LIST.length).toBeGreaterThan(5)
    for (const item of DEFAULT_PENGURUS_LIST) {
      expect(item.nama).toBeTruthy()
      expect(item.jabatan).toBeTruthy()
      expect(item.tugas).toBeTruthy()
      expect(['PENASEHAT', 'PIMPINAN', 'BIDANG', 'OPERASIONAL']).toContain(item.kategori)
    }
  })

  it('normalizePengurusList membersihkan dan memvalidasi baris pengurus', () => {
    const raw = [
      {
        id: 'p-1',
        nama: ' Ust. Budi ',
        jabatan: ' Ketua DKM ',
        kategori: 'PIMPINAN',
        tugas: ' Memimpin DKM ',
        isKhotib: true,
        isImam: true,
        urutan: 2,
      },
      {
        id: 'p-2',
        nama: ' Ali ',
        jabatan: ' Marbot ',
        kategori: 'OPERASIONAL',
        tugas: ' Kebersihan ',
        urutan: 1,
      },
      {
        nama: '', // invalid
        jabatan: 'Wakil',
      },
    ]

    const result = normalizePengurusList(raw)
    expect(result).toHaveLength(2)
    // Diurutkan berdasarkan urutan (1 duluan, lalu 2)
    expect(result[0].nama).toBe('Ali')
    expect(result[0].urutan).toBe(1)
    expect(result[1].nama).toBe('Ust. Budi')
    expect(result[1].isKhotib).toBe(true)
  })
})

describe('khotib generator', () => {
  it('findNextFriday menemukan hari Jumat terdekat', () => {
    // 2026-11-15 adalah hari Minggu (day 0)
    // Jumat berikutnya adalah 2026-11-20
    const fri = findNextFriday('2026-11-15')
    expect(formatIsoDate(fri)).toBe('2026-11-20')
    expect(fri.getDay()).toBe(5) // Friday

    // Jika baseDate sudah hari Jumat (misal 2026-11-20), tetap 2026-11-20
    const friSame = findNextFriday('2026-11-20')
    expect(formatIsoDate(friSame)).toBe('2026-11-20')
    expect(friSame.getDay()).toBe(5)
  })

  it('generateJumatSchedule menghasilkan rotasi Jumat secara berurutan dan teratur', () => {
    const schedule = generateJumatSchedule({
      startDate: '2026-11-20',
      countWeeks: 4,
      khotibList: ['Ust. Ahmad', 'Ust. Budi'],
      imamList: ['Ust. Hasan', 'Ust. Ali'],
    })

    expect(schedule).toHaveLength(4)
    expect(schedule[0]).toEqual({
      tanggal: '2026-11-20',
      khatib: 'Ust. Ahmad',
      imam: 'Ust. Hasan',
    })
    expect(schedule[1]).toEqual({
      tanggal: '2026-11-27',
      khatib: 'Ust. Budi',
      imam: 'Ust. Ali',
    })
    // Rotasi berulang
    expect(schedule[2]).toEqual({
      tanggal: '2026-12-04',
      khatib: 'Ust. Ahmad',
      imam: 'Ust. Hasan',
    })
    expect(schedule[3]).toEqual({
      tanggal: '2026-12-11',
      khatib: 'Ust. Budi',
      imam: 'Ust. Ali',
    })
  })

  it('generateJumatSchedule melempar error jika daftar khotib kosong', () => {
    expect(() =>
      generateJumatSchedule({
        startDate: '2026-11-20',
        countWeeks: 4,
        khotibList: [],
      }),
    ).toThrow('Daftar nama khotib minimal harus ada 1 orang')
  })
})
