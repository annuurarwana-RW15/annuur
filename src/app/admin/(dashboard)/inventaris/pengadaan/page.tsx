import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { formatRupiah } from '@/lib/format'
import { AcquisitionTable } from './AcquisitionTable'

export const metadata: Metadata = {
  title: 'Riwayat Pengadaan Inventaris — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function PengadaanInventarisPage() {
  await requireRole('ADMIN', 'BENDAHARA')

  const [acquisitions, items, cashCategories] = await Promise.all([
    db.inventoryAcquisition.findMany({
      include: {
        item: true,
        transaction: true,
      },
      orderBy: {
        date: 'desc',
      },
    }),
    db.inventoryItem.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        totalQty: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    db.category.findMany({
      where: {
        type: 'KELUAR',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  // Summary Metrics
  const totalPembelianKas = acquisitions
    .filter((a) => a.source === 'PEMBELIAN_KAS')
    .reduce((acc, curr) => acc + Number(curr.unitPrice ?? 0) * curr.quantity, 0)

  const totalUnitWakaf = acquisitions
    .filter((a) => a.source === 'WAKAF_HIBAH')
    .reduce((acc, curr) => acc + curr.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <nav className="text-xs text-neutral-500 mb-1">
            <Link href="/admin/inventaris" className="hover:underline">
              Inventaris
            </Link>{' '}
            / <span className="text-neutral-800 font-medium">Riwayat Pengadaan</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Riwayat Pengadaan & Penambahan Stok
          </h1>
          <p className="text-xs text-neutral-500">
            Catatan log perolehan barang masuk dari pembelian kas DKM maupun wakaf/hibah jamaah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventaris"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            ← Kembali ke Katalog
          </Link>
          <Link
            href="/admin/inventaris/peminjaman"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Sirkulasi Pinjam
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Transaksi Pengadaan</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {acquisitions.length} <span className="text-xs font-normal text-neutral-500">kali</span>
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Belanja via Kas DKM</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {formatRupiah(totalPembelianKas)}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Masuk via Wakaf/Hibah</p>
          <p className="mt-1 text-2xl font-bold text-purple-900">
            {totalUnitWakaf} <span className="text-xs font-normal text-neutral-500">unit</span>
          </p>
        </div>
      </div>

      {/* Navigasi Sub-Tab Modul */}
      <div className="flex border-b border-neutral-200">
        <Link
          href="/admin/inventaris"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
        >
          Katalog & Stok Barang
        </Link>
        <Link
          href="/admin/inventaris/peminjaman"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
        >
          Sirkulasi Peminjaman
        </Link>
        <Link
          href="/admin/inventaris/pengadaan"
          className="border-b-2 border-green-900 px-4 py-2 text-sm font-semibold text-green-900"
        >
          Pengadaan & Wakaf
        </Link>
      </div>

      {/* Tabel Riwayat Pengadaan */}
      <AcquisitionTable
        acquisitions={acquisitions}
        items={items}
        cashCategories={cashCategories}
      />
    </div>
  )
}
