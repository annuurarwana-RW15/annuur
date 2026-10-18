import { formatDateID, formatRupiah } from '@/lib/format'
import type { TransactionRow } from '@/lib/kas'

const JENIS_BADGE: Record<TransactionRow['type'], string> = {
  MASUK: 'bg-green-100 text-green-800',
  KELUAR: 'bg-red-100 text-red-800',
}

/**
 * Tabel ringkas baca-saja untuk dashboard. Sengaja bukan `DataTable`:
 * kotak cari & paginasi `DataTable` selalu ikut tampil dan akan menulis
 * `?q=` / `?page=` ke `/admin` yang tidak pernah membacanya.
 */
export function RecentTransactions({ rows }: { rows: TransactionRow[] }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-sm font-semibold text-neutral-900">Transaksi terbaru</h2>
        <a
          href="/admin/kas/transaksi"
          className="text-xs font-medium text-green-800 hover:underline"
        >
          Lihat semua
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-neutral-500">
          Belum ada transaksi pada periode ini.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-black/5 bg-neutral-50 text-left text-xs text-neutral-500">
                <th scope="col" className="px-5 py-2 font-medium">
                  Tanggal
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Keterangan
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Kategori
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Jenis
                </th>
                <th scope="col" className="px-5 py-2 text-right font-medium">
                  Nominal
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="whitespace-nowrap px-5 py-2.5 text-neutral-600">
                    {formatDateID(row.date)}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-900">{row.description}</td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    {row.categoryName ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${JENIS_BADGE[row.type]}`}
                    >
                      {row.type === 'MASUK' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-2.5 text-right font-medium tabular-nums ${
                      row.type === 'MASUK' ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {row.type === 'MASUK' ? '+' : '−'}
                    {formatRupiah(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
