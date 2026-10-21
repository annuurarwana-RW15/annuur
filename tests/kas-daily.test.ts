import { describe, expect, it } from 'vitest'
import { buildDailyMonthSeries, type DailyFlowRow } from '@/lib/kas-daily'

function tx(tanggal: string, jenis: 'MASUK' | 'KELUAR', nominal: number): DailyFlowRow {
  // Disimpan sebagai UTC-midnight (z.coerce.date dari input YYYY-MM-DD).
  return { date: new Date(tanggal), type: jenis, amount: nominal }
}

// Anchor: 15 Oktober 2026 (waktu lokal) → titik hari 1..15.
const NOW = new Date(2026, 9, 15, 12, 0, 0)

describe('buildDailyMonthSeries', () => {
  it('tanpa transaksi → titik 1..hari-ini semuanya nol dengan label bulan benar', () => {
    const result = buildDailyMonthSeries([], NOW)

    expect(result.bulan).toBe('Oktober 2026')
    expect(result.points).toHaveLength(15)
    expect(result.points.map((p) => p.hari)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    )
    expect(
      result.points.every((p) => p.masuk === 0 && p.keluar === 0 && p.total === 0),
    ).toBe(true)
  })

  it('mengelompokkan masuk/keluar per hari & total kumulatif berjalan', () => {
    const rows = [
      tx('2026-10-05', 'MASUK', 50_000),
      tx('2026-10-05', 'KELUAR', 30_000),
      tx('2026-10-15', 'MASUK', 10_000),
    ]
    const result = buildDailyMonthSeries(rows, NOW)

    const d5 = result.points[4]
    expect(d5.hari).toBe(5)
    expect(d5.masuk).toBe(50_000)
    expect(d5.keluar).toBe(30_000)
    expect(d5.total).toBe(20_000)

    // hari tanpa transaksi tetap membawa saldo berjalan
    expect(result.points[5].hari).toBe(6)
    expect(result.points[5].masuk).toBe(0)
    expect(result.points[5].total).toBe(20_000)

    expect(result.points[14].total).toBe(30_000)
  })

  it('saldo sebelum bulan berjalan menjadi total awal (opening saldo periode)', () => {
    const rows = [
      tx('2026-09-30', 'MASUK', 100_000),
      tx('2026-08-01', 'KELUAR', 40_000),
      tx('2026-10-05', 'MASUK', 50_000),
    ]
    const result = buildDailyMonthSeries(rows, NOW)

    // hari 1 belum ada mutasi bulan ini → total = opening 60_000
    expect(result.points[0].masuk).toBe(0)
    expect(result.points[0].keluar).toBe(0)
    expect(result.points[0].total).toBe(60_000)

    // bukan terhitung sebagai masuk/keluar bulan ini
    expect(result.points.every((p) => p.masuk === 50_000 || p.masuk === 0)).toBe(true)
    expect(result.points[14].total).toBe(110_000)
  })

  it('transaksi bertanggal hari mendatang & bulan depan diabaikan', () => {
    const rows = [
      tx('2026-10-20', 'MASUK', 999_999), // hari ke-20, lewat NOW (15)
      tx('2026-11-01', 'MASUK', 555_555), // bulan depan
      tx('2026-10-14', 'MASUK', 10_000),
    ]
    const result = buildDailyMonthSeries(rows, NOW)

    expect(result.points).toHaveLength(15)
    expect(result.points[14].total).toBe(10_000)
    expect(result.points.reduce((sum, p) => sum + p.masuk, 0)).toBe(10_000)
  })

  it('label hari = angka hari (1, 2, 3, …) untuk sumbu X', () => {
    const result = buildDailyMonthSeries([], NOW)
    expect(result.points.map((p) => p.label)).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 1)),
    )
  })

  it('awal bulan (tanggal 1) → satu titik saja', () => {
    const result = buildDailyMonthSeries(
      [tx('2026-01-01', 'MASUK', 5_000)],
      new Date(2026, 0, 1, 8, 0, 0),
    )
    expect(result.bulan).toBe('Januari 2026')
    expect(result.points).toHaveLength(1)
    expect(result.points[0].total).toBe(5_000)
  })

  it('lintas tahun: bulan Desember memakai transaksi periode sebelumnya sebagai opening', () => {
    const rows = [
      tx('2026-11-30', 'MASUK', 70_000),
      tx('2026-12-25', 'KELUAR', 20_000),
    ]
    const result = buildDailyMonthSeries(rows, new Date(2026, 11, 31, 9, 0, 0))

    expect(result.bulan).toBe('Desember 2026')
    expect(result.points).toHaveLength(31)
    expect(result.points[0].total).toBe(70_000) // 1 Des: belum ada mutasi Des
    expect(result.points[30].total).toBe(50_000)
  })
})
