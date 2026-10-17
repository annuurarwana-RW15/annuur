import type { PublicTransactionRow } from './rows'

/** Nama bulan pendek (id-ID), deterministik tanpa ICU. */
const BULAN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

/** Satu titik tren kas per bulan. */
export interface PublicTrendPoint {
  /** Key bulan stabil (YYYY-MM), dipakai sort/lookup. */
  key: string
  /** Label sumbu X, contoh "Okt 26". */
  bulan: string
  masuk: number
  keluar: number
  /** Saldo kumulatif dari bulan pertama window sampai bulan ini. */
  saldo: number
}

function labelFromKey(key: string): string {
  const [year, month] = key.split('-')
  const monthIndex = Number(month) - 1
  return `${BULAN_SHORT[monthIndex] ?? month} ${year.slice(-2)}`
}

/**
 * Kelompokkan transaksi menjadi deret bulanan untuk grafik tren.
 *
 * - `months` bulan terakhir diakhiri bulan berjalan (`now`), termasuk bulan
 *   tanpa transaksi agar sumbu X tetap kontinu.
 * - `saldo` dihitung kumulatif (running balance) sepanjang window, bukan net
 *   per bulan, agar terlihat arah kekayaan kas.
 * - Transaksi di luar window (lebih lama) diabaikan.
 *
 * Pemanggil sudah menyaring kategori publik & periode aktif, sehingga tren ini
 * konsisten dengan tabel ringkasan/daftar di halaman yang sama.
 */
export function buildMonthlyTrend(
  rows: PublicTransactionRow[],
  months: number,
  now: Date = new Date(),
): PublicTrendPoint[] {
  const count = Math.max(1, Math.floor(months))

  const windowKeys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    windowKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const first = windowKeys[0]
  const last = windowKeys[windowKeys.length - 1]

  const buckets = new Map(windowKeys.map((key) => [key, { masuk: 0, keluar: 0 }]))

  for (const row of rows) {
    const key = row.tanggal.slice(0, 7)
    if (key < first || key > last) continue
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.jenis === 'MASUK') bucket.masuk += row.nominal
    else bucket.keluar += row.nominal
  }

  let running = 0
  return windowKeys.map((key) => {
    const bucket = buckets.get(key)!
    running += bucket.masuk - bucket.keluar
    return {
      key,
      bulan: labelFromKey(key),
      masuk: bucket.masuk,
      keluar: bucket.keluar,
      saldo: running,
    }
  })
}
