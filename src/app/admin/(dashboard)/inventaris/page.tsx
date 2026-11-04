import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { InventoryMetrics } from './InventoryMetrics'
import { InventarisTable } from './InventarisTable'
import { ItemForm } from './form'

export const metadata: Metadata = {
  title: 'Katalog Inventaris — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function InventarisPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const edit = first(sp.edit)

  // Mode Form Tambah / Edit Barang
  if (edit) {
    const item =
      edit === 'new'
        ? undefined
        : await db.inventoryItem.findUnique({ where: { id: edit } })
    if (edit !== 'new' && !item) notFound()

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {item ? `Edit Barang: ${item.name}` : 'Tambah Barang Inventaris'}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Pencatatan aset, peralatan, dan sarana prasarana milik masjid.
            </p>
          </div>
          <Link
            href="/admin/inventaris"
            className="text-sm font-medium text-green-900 hover:underline"
          >
            ← Kembali ke daftar
          </Link>
        </div>
        <ItemForm {...(item ? { item } : {})} />
      </div>
    )
  }

  // Ambil seluruh data inventaris
  const items = await db.inventoryItem.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const totalItems = items.length
  const totalAvailable = items.reduce((acc, curr) => acc + curr.availableQty, 0)
  const totalBorrowed = items.reduce((acc, curr) => acc + curr.borrowedQty, 0)
  const totalBroken = items.reduce((acc, curr) => acc + curr.brokenQty, 0)

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Inventaris & Tata Kelola Aset
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Katalog barang, pengelolaan stok, peminjaman warga, dan log pengadaan masjid.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventaris/peminjaman/baru"
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50"
          >
            + Pinjamkan Barang
          </Link>
          <Link
            href="/admin/inventaris?edit=new"
            className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
          >
            + Tambah Aset Baru
          </Link>
        </div>
      </div>

      {/* Ringkasan Metrik */}
      <InventoryMetrics
        totalItems={totalItems}
        totalAvailable={totalAvailable}
        totalBorrowed={totalBorrowed}
        totalBroken={totalBroken}
      />

      {/* Navigasi Sub-Tab Modul */}
      <div className="flex border-b border-neutral-200">
        <Link
          href="/admin/inventaris"
          className="border-b-2 border-green-900 px-4 py-2 text-sm font-semibold text-green-900"
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
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
        >
          Pengadaan & Wakaf
        </Link>
      </div>

      {/* Tabel Master Barang */}
      <InventarisTable items={items} />
    </div>
  )
}

