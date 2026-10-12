'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Article } from '@prisma/client'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID } from '@/lib/format'
import { deleteArticle } from './actions'

interface ArticlesTableProps {
  /** Baris halaman ini (sudah difilter & dipaginasi di server). */
  rows: Article[]
  total: number
  page: number
  pageSize: number
}

const STATUS_BADGE: Record<Article['status'], string> = {
  DRAFT: 'bg-neutral-100 text-neutral-500',
  PUBLISHED: 'bg-green-100 text-green-800',
}

/**
 * Pembungkus client: kolom berisi `render` (fungsi) tidak bisa diserialisasi
 * dari Server Component — definisi kolom wajib hidup di lapisan client
 * (pola yang sama dengan `SectionsTable`).
 */
export function ArticlesTable({ rows, total, page, pageSize }: ArticlesTableProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(row: Article) {
    const confirmed = window.confirm(
      `Hapus artikel "${row.title}"? Tindakan ini tidak bisa dibatalkan.`,
    )
    if (!confirmed) return

    setBusyId(row.id)
    setError(null)
    try {
      await deleteArticle(row.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus artikel')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Article>[] = [
    {
      key: 'title',
      label: 'Judul',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            href={`/admin/artikel/${row.id}`}
            className="font-medium text-neutral-900 hover:underline"
          >
            {row.title}
          </Link>
          <p className="text-xs text-neutral-400">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (row) =>
        row.category || <span className="text-neutral-400">—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      align: 'right',
      render: (row) => row.viewCount,
    },
    {
      key: 'createdAt',
      label: 'Tanggal',
      sortable: true,
      render: (row) => formatDateID(row.publishedAt ?? row.createdAt),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/artikel/${row.id}`}
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
        searchPlaceholder="Cari judul atau kutipan…"
        exportFilename="artikel"
        basePath="/admin/artikel"
      />
    </div>
  )
}
