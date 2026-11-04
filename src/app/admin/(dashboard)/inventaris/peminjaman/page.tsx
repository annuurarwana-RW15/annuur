import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { deriveLoanStatus } from '@/lib/inventaris'
import { requireRole } from '@/lib/rbac'
import { ensureInventoryTables } from '@/lib/inventaris-db'
import { PeminjamanTable } from './PeminjamanTable'

export const metadata: Metadata = {
  title: 'Sirkulasi Peminjaman — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function PeminjamanPage() {
  await requireRole('ADMIN', 'BENDAHARA')
  await ensureInventoryTables()

  const loansRaw = await db.inventoryLoan.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          item: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  })

  // Periksa secara dinamis jika ada pinjaman yang berubah menjadi TERLAMBAT
  const now = new Date()
  const loans = loansRaw.map((l) => {
    const derivedStatus = deriveLoanStatus(l.items, l.expectedReturn, now)
    return {
      ...l,
      status: derivedStatus,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Sirkulasi Peminjaman Peralatan
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pencatatan barang yang dipinjam warga, pengembalian bertahap, dan slip bukti serah terima.
          </p>
        </div>

        <Link
          href="/admin/inventaris/peminjaman/baru"
          className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
        >
          + Catat Pinjam Baru
        </Link>
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
          className="border-b-2 border-green-900 px-4 py-2 text-sm font-semibold text-green-900"
        >
          Sirkulasi Peminjaman
        </Link>
        <Link
          href="/admin/inventaris/pengadaan"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
        >
          Pengadaan & Wakaf
        </Link>
      </div>

      <PeminjamanTable loans={loans} />
    </div>
  )
}

