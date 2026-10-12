'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID, formatRupiah } from '@/lib/format'
import type { TransactionRow } from '@/lib/kas'
import { buildTableHref, type HrefPatch } from '@/lib/table-query'
import { deleteTransaction } from './actions'

const BASE_PATH = '/admin/kas/transaksi'

const JENIS_BADGE: Record<TransactionRow['type'], string> = {
  MASUK: 'bg-green-100 text-green-800',
  KELUAR: 'bg-red-100 text-red-800',
}

interface TransactionsTableProps {
  /** Baris halaman ini (sudah difilter & dipaginasi di server). */
  rows: TransactionRow[]
  total: number
  page: number
  pageSize: number
  categories: { id: string; name: string }[]
}

/**
 * Pembungkus client: kolom berisi `render` (fungsi) tidak bisa diserialisasi
 * dari Server Component — definisi kolom wajib hidup di lapisan client
 * (pola `artikel/ArticlesTable` dengan paginasi & filter server sungguhan).
 */
export function TransactionsTable({
  rows,
  total,
  page,
  pageSize,
  categories,
}: TransactionsTableProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(row: TransactionRow) {
    const confirmed = window.confirm(
      `Hapus transaksi "${row.description}"? Tindakan ini tidak bisa dibatalkan.`,
    )
    if (!confirmed) return

    setBusyId(row.id)
    setError(null)
    try {
      const result = await deleteTransaction(row.id)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus transaksi')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<TransactionRow>[] = [
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (row) => formatDateID(row.date),
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
      // key flat `categoryName` agar cell export CSV/Excel ikut terisi
      // (object `category` jatuh ke '' di `DataTable.exportCell`).
      key: 'categoryName',
      label: 'Kategori',
      render: (row) =>
        row.category ? (
          <span className="flex items-center gap-2 text-neutral-700">
            {row.category.color ? (
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: row.category.color }}
              />
            ) : null}
            {row.category.name}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    {
      key: 'description',
      label: 'Keterangan',
      render: (row) => (
        <span title={row.description} className="block max-w-[16rem] truncate">
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Nominal',
      sortable: true,
      align: 'right',
      render: (row) => {
        const isMasuk = row.type === 'MASUK'
        return (
          <span
            className={`font-medium ${isMasuk ? 'text-green-700' : 'text-red-600'}`}
          >
            {isMasuk ? '+' : '−'}
            {formatRupiah(row.amount)}
          </span>
        )
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`${BASE_PATH}?edit=${row.id}`}
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
        searchPlaceholder="Cari keterangan atau kategori…"
        exportFilename="transaksi-kas"
        basePath={BASE_PATH}
        toolbarExtra={<FilterControls categories={categories} />}
      />
    </div>
  )
}

/**
 * Filter tambahan di luar q/sort: type, kategori, rentang tanggal.
 * Semua menulis URL search params & me-reset page=1 (filter server-side).
 */
function FilterControls({
  categories,
}: {
  categories: { id: string; name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const href = (patch: HrefPatch) => buildTableHref(BASE_PATH, searchParams, patch)

  const type = searchParams.get('type') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const controlClass =
    'rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-neutral-700'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-500">Jenis</span>
        <select
          value={type}
          aria-label="Filter jenis"
          onChange={(event) =>
            router.replace(
              href({ type: event.target.value || undefined, page: 1 }),
            )
          }
          className={controlClass}
        >
          <option value="">Semua</option>
          <option value="MASUK">Masuk</option>
          <option value="KELUAR">Keluar</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-500">Kategori</span>
        <select
          value={categoryId}
          aria-label="Filter kategori"
          onChange={(event) =>
            router.replace(
              href({ categoryId: event.target.value || undefined, page: 1 }),
            )
          }
          className={controlClass}
        >
          <option value="">Semua</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-500">Dari</span>
        <input
          type="date"
          value={from}
          aria-label="Dari tanggal"
          onChange={(event) =>
            router.replace(href({ from: event.target.value || undefined, page: 1 }))
          }
          className={controlClass}
        />
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-500">Sampai</span>
        <input
          type="date"
          value={to}
          aria-label="Sampai tanggal"
          onChange={(event) =>
            router.replace(href({ to: event.target.value || undefined, page: 1 }))
          }
          className={controlClass}
        />
      </label>
    </div>
  )
}
