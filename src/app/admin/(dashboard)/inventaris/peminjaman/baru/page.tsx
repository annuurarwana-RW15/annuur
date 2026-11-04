import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { LoanForm } from './LoanForm'

export const metadata: Metadata = {
  title: 'Pinjamkan Peralatan — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function PeminjamanBaruPage() {
  await requireRole('ADMIN', 'BENDAHARA')

  const availableItems = await db.inventoryItem.findMany({
    where: {
      isBorrowable: true,
      availableQty: { gt: 0 },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Formulir Peminjaman Peralatan Masjid
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pencatatan sirkulasi barang keluar untuk warga, kegiatan majelis, atau acara RT/RW.
          </p>
        </div>
        <Link
          href="/admin/inventaris/peminjaman"
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali ke sirkulasi
        </Link>
      </div>

      <LoanForm availableItems={availableItems} />
    </div>
  )
}

