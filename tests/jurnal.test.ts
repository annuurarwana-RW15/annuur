import { describe, expect, it } from 'vitest'
import {
  filterJournal,
  journalTotals,
  journalToCsv,
  journalToExcelHtml,
  parseISODate,
  sortJournal,
  type JournalEntry,
} from '@/lib/jurnal'

function entry(overrides: Partial<JournalEntry> & { no: number }): JournalEntry {
  return {
    id: `e${overrides.no}`,
    tanggal: new Date(2026, 9, overrides.no),
    description: `Entri ${overrides.no}`,
    kategoriId: 'cat-infak',
    kategori: 'Infak',
    jenis: 'MASUK',
    masuk: 0,
    keluar: 0,
    saldo: 0,
    ...overrides,
  }
}

/** Buku besar penuh 5 entri, saldo berjalan sudah dihitung (invarian). */
const FULL: JournalEntry[] = [
  entry({ no: 1, jenis: 'MASUK', masuk: 100_000, saldo: 100_000 }),
  entry({
    no: 2,
    jenis: 'KELUAR',
    kategoriId: 'cat-sosial',
    kategori: 'Sosial',
    keluar: 30_000,
    saldo: 70_000,
    description: 'Santunan anak yatim',
  }),
  entry({ no: 3, jenis: 'MASUK', masuk: 50_000, saldo: 120_000 }),
  entry({
    no: 4,
    jenis: 'KELUAR',
    kategoriId: 'cat-sosial',
    kategori: 'Sosial',
    keluar: 20_000,
    saldo: 100_000,
    description: 'Operasional',
  }),
  entry({ no: 5, jenis: 'MASUK', masuk: 40_000, saldo: 140_000 }),
]

const saldoMap = (rows: JournalEntry[]) => rows.map((r) => [r.no, r.saldo] as const)

describe('parseISODate', () => {
  it('menerima YYYY-MM-DD valid', () => {
    expect(parseISODate('2026-10-15')?.getFullYear()).toBe(2026)
    expect(parseISODate('2026-10-15')?.getMonth()).toBe(9)
  })
  it('menolak format salah', () => {
    expect(parseISODate('15-10-2026')).toBeUndefined()
    expect(parseISODate('2026-10')).toBeUndefined()
    expect(parseISODate('')).toBeUndefined()
    expect(parseISODate(undefined)).toBeUndefined()
  })
  it('menolak roll-over kalender', () => {
    expect(parseISODate('2026-02-31')).toBeUndefined()
    expect(parseISODate('2026-13-01')).toBeUndefined()
    expect(parseISODate('2026-00-10')).toBeUndefined()
  })
})

describe('filterJournal — invarian saldo', () => {
  it('filter tidak mengubah saldo baris mana pun', () => {
    const before = saldoMap(FULL)
    const filtered = filterJournal(FULL, { q: 'santunan' })
    for (const row of filtered) {
      expect(row.saldo).toBe(FULL.find((r) => r.no === row.no)!.saldo)
      expect(row.no).toBe(FULL.find((r) => r.no === row.no)!.no)
    }
    expect(saldoMap(FULL)).toEqual(before)
  })

  it('filter kategori menyisakan hanya kategori itu', () => {
    expect(filterJournal(FULL, { categoryId: 'cat-sosial' }).map((r) => r.no)).toEqual([
      2, 4,
    ])
  })

  it('filter jenis', () => {
    expect(filterJournal(FULL, { jenis: 'KELUAR' }).map((r) => r.no)).toEqual([2, 4])
    expect(filterJournal(FULL, { jenis: 'MASUK' }).map((r) => r.no)).toEqual([1, 3, 5])
  })

  it('filter rentang tanggal inklusif', () => {
    // entri memakai tanggal 3..7 Okt 2026 (new Date(2026,9,no))
    expect(filterJournal(FULL, { dari: '2026-10-04', sampai: '2026-10-06' }).map((r) => r.no)).toEqual([
      4, 5,
    ])
  })

  it('search q mencocokkan deskripsi & kategori, case-insensitive', () => {
    expect(filterJournal(FULL, { q: 'SANTUNAN' }).map((r) => r.no)).toEqual([2])
    expect(filterJournal(FULL, { q: 'infak' }).map((r) => r.no)).toEqual([1, 3, 5])
  })

  it('tanpa filter → semua baris, urutan asli', () => {
    expect(filterJournal(FULL, {}).map((r) => r.no)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('sortJournal', () => {
  it('asc mengembalikan urutan asli tanpa menyentuh saldo', () => {
    const sorted = sortJournal(FULL, 'asc')
    expect(sorted.map((r) => r.no)).toEqual([1, 2, 3, 4, 5])
    expect(saldoMap(sorted)).toEqual(saldoMap(FULL))
  })
  it('desc membalik urutan, nilai saldo identik', () => {
    const sorted = sortJournal(FULL, 'desc')
    expect(sorted.map((r) => r.no)).toEqual([5, 4, 3, 2, 1])
    expect(sorted.map((r) => r.saldo)).toEqual([140_000, 100_000, 120_000, 70_000, 100_000])
  })
})

describe('journalTotals', () => {
  it('menjumlah masuk/keluar & net TANPA saldoAwal', () => {
    expect(journalTotals(FULL)).toEqual({
      totalMasuk: 190_000,
      totalKeluar: 50_000,
      net: 140_000,
    })
  })
  it('subtotal terfilter ≠ total penuh (kartu tetap level periode)', () => {
    const sub = journalTotals(filterJournal(FULL, { categoryId: 'cat-sosial' }))
    expect(sub.totalMasuk).toBe(0)
    expect(sub.totalKeluar).toBe(50_000)
    expect(sub.net).toBe(-50_000)
  })
  it('himpunan kosong → semua nol', () => {
    expect(journalTotals([])).toEqual({ totalMasuk: 0, totalKeluar: 0, net: 0 })
  })
})

describe('ekspor', () => {
  const ctx = {
    saldoAwal: 500_000,
    entries: FULL,
    periodLabel: 'Periode 2026 (1 Jan – 31 Des 2026)',
  }

  it('CSV memuat kop, saldo awal, header kolom, dan baris SALDO AKHIR', () => {
    const csv = journalToCsv(ctx)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('LAPORAN JURNAL KAS')
    expect(csv).toContain('Saldo Awal (periode sebelumnya);500000')
    expect(csv).toContain('No;Tanggal;Keterangan;Kategori;Jenis;Masuk;Keluar;Saldo')
    expect(csv).toContain('SALDO AKHIR')
    // saldoAkhir = saldoAwal(500000) + net(140000) = 640000
    expect(csv).toContain('640000')
  })

  it('CSV memuat catatan filter bila ada', () => {
    const csv = journalToCsv({ ...ctx, filterNote: 'kategori Sosial' })
    expect(csv).toContain('Filter;kategori Sosial')
  })

  it('Excel HTML memuat kop & kolom', () => {
    const html = journalToExcelHtml(ctx)
    expect(html).toContain('LAPORAN JURNAL KAS')
    expect(html).toContain('<th>Saldo</th>')
    expect(html).toContain('640000')
  })

  it('Excel HTML meng-escape teks berbahaya', () => {
    const html = journalToExcelHtml({
      ...ctx,
      entries: [entry({ no: 1, description: '<script>x</script>', saldo: 1 })],
    })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
