import { describe, expect, it } from 'vitest'
import { buildMonthlyTrend } from '@/app/(public)/laporan-kas/trend'
import type { PublicTransactionRow } from '@/app/(public)/laporan-kas/rows'

function tx(
  tanggal: string,
  jenis: 'MASUK' | 'KELUAR',
  nominal: number,
): PublicTransactionRow {
  return {
    id: `tx-${tanggal}-${jenis}-${nominal}`,
    tanggal,
    jenis,
    kategoriName: 'Infak',
    nominal,
    keterangan: null,
    receiptImage: null,
  }
}

// Anchor: 15 Oktober 2026 → window 6 bulan = Mei..Okt 2026.
const NOW = new Date(2026, 9, 15)

describe('buildMonthlyTrend', () => {
  it('tanpa transaksi → N titik nol dengan label bulan benar', () => {
    const result = buildMonthlyTrend([], 6, NOW)
    expect(result).toHaveLength(6)
    expect(result.map((p) => p.key)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(result.map((p) => p.bulan)).toEqual([
      'Mei 26',
      'Jun 26',
      'Jul 26',
      'Agu 26',
      'Sep 26',
      'Okt 26',
    ])
    expect(result.every((p) => p.masuk === 0 && p.keluar === 0 && p.saldo === 0)).toBe(
      true,
    )
  })

  it('mengelompokkan masuk/keluar per bulan & saldo kumulatif', () => {
    const rows = [
      tx('2026-09-10', 'MASUK', 100_000),
      tx('2026-09-20', 'MASUK', 50_000),
      tx('2026-10-05', 'KELUAR', 80_000),
    ]
    const result = buildMonthlyTrend(rows, 6, NOW)
    const sep = result.find((p) => p.key === '2026-09')!
    const okt = result.find((p) => p.key === '2026-10')!

    expect(sep.masuk).toBe(150_000)
    expect(sep.keluar).toBe(0)
    expect(sep.saldo).toBe(150_000)

    expect(okt.masuk).toBe(0)
    expect(okt.keluar).toBe(80_000)
    // saldo kumulatif: 150_000 - 80_000
    expect(okt.saldo).toBe(70_000)
  })

  it('bulan kosong di tengah window tetap muncul (sumbu X kontinu)', () => {
    const rows = [tx('2026-05-01', 'MASUK', 10_000), tx('2026-10-01', 'MASUK', 20_000)]
    const result = buildMonthlyTrend(rows, 6, NOW)
    const jul = result.find((p) => p.key === '2026-07')!
    expect(jul.masuk).toBe(0)
    expect(jul.keluar).toBe(0)
    expect(jul.saldo).toBe(10_000) // saldo kumulatif dari bulan sebelumnya
  })

  it('transaksi di luar window diabaikan', () => {
    const rows = [
      tx('2026-04-30', 'MASUK', 999_999), // sebelum window (Mei)
      tx('2025-12-01', 'MASUK', 555_555), // tahun lalu
    ]
    const result = buildMonthlyTrend(rows, 6, NOW)
    expect(result.every((p) => p.masuk === 0)).toBe(true)
    expect(result.every((p) => p.saldo === 0)).toBe(true)
  })

  it('window 12 bulan membentang lintas tahun dengan label benar', () => {
    const result = buildMonthlyTrend([], 12, NOW)
    expect(result).toHaveLength(12)
    expect(result[0].key).toBe('2025-11')
    expect(result[0].bulan).toBe('Nov 25')
    expect(result[11].key).toBe('2026-10')
    expect(result[11].bulan).toBe('Okt 26')
  })

  it('months < 1 di-clamp minimal 1', () => {
    expect(buildMonthlyTrend([], 0, NOW)).toHaveLength(1)
    expect(buildMonthlyTrend([], -5, NOW)).toHaveLength(1)
  })
})
