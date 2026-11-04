import type { ReactElement } from 'react'

export interface InventoryMetricsProps {
  totalItems: number
  totalAvailable: number
  totalBorrowed: number
  totalBroken: number
}

export function InventoryMetrics({
  totalItems,
  totalAvailable,
  totalBorrowed,
  totalBroken,
}: InventoryMetricsProps): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Total Jenis Barang
        </p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{totalItems}</p>
        <p className="mt-1 text-xs text-neutral-400">Katalog aset terdaftar</p>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs">
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Siap Dipinjam
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-900">{totalAvailable}</p>
        <p className="mt-1 text-xs text-emerald-700/80">Tersedia di gudang</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs">
        <p className="text-xs font-medium text-blue-800 uppercase tracking-wider">
          Sedang Dipinjam
        </p>
        <p className="mt-1 text-2xl font-bold text-blue-900">{totalBorrowed}</p>
        <p className="mt-1 text-xs text-blue-700/80">Ada di warga/kegiatan</p>
      </div>

      <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-xs">
        <p className="text-xs font-medium text-rose-800 uppercase tracking-wider">
          Perlu Perbaikan
        </p>
        <p className="mt-1 text-2xl font-bold text-rose-900">{totalBroken}</p>
        <p className="mt-1 text-xs text-rose-700/80">Rusak / dalam servis</p>
      </div>
    </div>
  )
}

