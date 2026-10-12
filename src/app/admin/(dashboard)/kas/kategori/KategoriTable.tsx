'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Category } from '@prisma/client'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { deleteCategory } from './actions'

interface KategoriTableProps {
  /** Baris halaman ini (sudah difilter & dipaginasi di server). */
  rows: Category[]
  total: number
  page: number
  pageSize: number
}

const JENIS_BADGE: Record<Category['type'], string> = {
  MASUK: 'bg-green-100 text-green-800',
  KELUAR: 'bg-red-100 text-red-800',
}

const STATUS_BADGE: Record<string, string> = {
  aktif: 'bg-green-100 text-green-800',
  nonaktif: 'bg-neutral-100 text-neutral-500',
}

/**
 * Pembungkus client: kolom berisi `render` (fungsi) tidak bisa diserialisasi
 * dari Server Component — definisi kolom wajib hidup di lapisan client
 * (pola `artikel/ArticlesTable` dengan paginasi server sungguhan).
 */
export function KategoriTable({ rows, total, page, pageSize }: KategoriTableProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(row: Category) {
    const confirmed = window.confirm(
      `Hapus kategori "${row.name}"? Tindakan ini tidak bisa dibatalkan.`,
    )
    if (!confirmed) return

    setBusyId(row.id)
    setError(null)
    try {
      const result = await deleteCategory(row.id)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kategori')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Category>[] = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-2 font-medium text-neutral-900">
          {row.color ? (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: row.color }}
            />
          ) : null}
          {row.name}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Jenis',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${JENIS_BADGE[row.type]}`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            STATUS_BADGE[row.isActive ? 'aktif' : 'nonaktif']
          }`}
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/kas/kategori?edit=${row.id}`}
            className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-neutral-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => void handleDelete(row)}
            disabled={busyId === row.id}
            className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busyId === row.id ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        searchPlaceholder="Cari nama kategori…"
        exportFilename="kategori-kas"
        basePath="/admin/kas/kategori"
      />
    </div>
  )
}
