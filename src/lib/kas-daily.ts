/** Nama bulan panjang (id-ID) — deterministik tanpa ICU, konsisten dengan tren. */
const BULAN_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Satu baris transaksi ringan (hanya field yang dibutuhkan agregasi harian). */
export interface DailyFlowRow {
  /** Tanggal transaksi (UTC-midnight, format input YYYY-MM-DD). */
  date: Date
  type: 'MASUK' | 'KELUAR'
  amount: number
}

/** Satu titik arus kas per hari dalam bulan berjalan. */
export interface DailyFlowPoint {
  /** Hari dalam bulan (1..hari-ini). */
  hari: number
  /** Label sumbu X, contoh "5". */
  label: string
  masuk: number
  keluar: number
  /**
   * Total (saldo berjalan) kumulatif PERIODE sampai akhir hari itu —
   * termasuk saldo sebelum bulan berjalan, sehingga titik terakhir
   * sama dengan "Saldo kas periode berjalan".
   */
  total: number
}

export interface DailyMonthSeries {
  /** Nama bulan berjalan, contoh "Oktober 2026". */
  bulan: string
  points: DailyFlowPoint[]
}

/**
 * Deret arus kas harian untuk bulan berjalan (`now`), dari transaksi satu periode.
 *
 * - Batas hari memakai kalender LOKAL `now` yang dipetakan ke boundary UTC —
 *   konsisten dengan penyimpanan `date` (UTC-midnight) dan `getDayFlow`.
 * - Transaksi sebelum bulan berjalan dihitung sebagai SALDO AWAL (opening) —
 *   bukan masuk/keluar bulan ini — agar `total` tetap konsisten dengan saldo
 *   besar di section Laporan Keuangan.
 * - Hari mendatang (lewat `now`) dan bulan depan tidak diikutkan.
 * - Hari tanpa transaksi tetap muncul (0) agar sumbu X kontinu 1..hari-ini.
 */
export function buildDailyMonthSeries(
  rows: DailyFlowRow[],
  now: Date = new Date(),
): DailyMonthSeries {
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const monthStart = new Date(Date.UTC(year, month, 1))
  const endExclusive = new Date(Date.UTC(year, month, today + 1))

  let opening = 0
  const buckets = Array.from({ length: today }, () => ({ masuk: 0, keluar: 0 }))

  for (const row of rows) {
    if (Number.isNaN(row.date.getTime())) continue
    if (row.date.getTime() < monthStart.getTime()) {
      opening += row.type === 'MASUK' ? row.amount : -row.amount
      continue
    }
    if (row.date.getTime() >= endExclusive.getTime()) continue
    const day = row.date.getUTCDate()
    const bucket = buckets[day - 1]
    if (!bucket) continue
    if (row.type === 'MASUK') bucket.masuk += row.amount
    else bucket.keluar += row.amount
  }

  let running = opening
  const points: DailyFlowPoint[] = buckets.map((bucket, index) => {
    running += bucket.masuk - bucket.keluar
    const hari = index + 1
    return {
      hari,
      label: String(hari),
      masuk: bucket.masuk,
      keluar: bucket.keluar,
      total: running,
    }
  })

  return {
    bulan: `${BULAN_FULL[month] ?? month + 1} ${year}`,
    points,
  }
}
