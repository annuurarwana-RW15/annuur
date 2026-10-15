'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { deleteGaleriItem } from './actions'

export interface GaleriRow {
  /** Posisi pada array `images` section — kunci aksi edit/hapus. */
  index: number
  url: string
  caption: string
}

interface GaleriTableProps {
  /** Baris tampil (sudah difilter search di server). */
  items: GaleriRow[]
  /** Kata kunci pencarian aktif — disimpan di link edit. */
  needle: string
}

function editHref(index: number, needle: string): string {
  const params = new URLSearchParams()
  if (needle) params.set('q', needle)
  params.set('edit', String(index))
  return `/admin/galeri?${params.toString()}`
}

/**
 * Pembungkus client: kolom berisi `render` tidak bisa diserialisasi dari
 * Server Component ke `DataTable`, sehingga kolom didefinisikan di lapisan client.
 */
export function GaleriTable({ items, needle }: GaleriTableProps) {
  const router = useRouter()
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(row: GaleriRow) {
    const label = row.caption || row.url
    const confirmed = window.confirm(`Hapus foto "${label}" dari galeri?`)
    if (!confirmed) return

    setBusyIndex(row.index)
    setError(null)
    try {
      const result = await deleteGaleriItem(row.index)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error ?? 'Gagal menghapus foto')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto')
    } finally {
      setBusyIndex(null)
    }
  }

  const columns: Column<GaleriRow>[] = [
    {
      key: 'foto',
      label: 'Foto',
      render: (row) => (
        // eslint-disable-next-line @next/next/no-img-element -- URL R2/eksternal, next/image tidak cocok untuk daftar admin
        <img
          src={row.url}
          alt={row.caption || 'Foto galeri'}
          className="h-12 w-12 rounded-md border border-black/10 bg-neutral-50 object-cover"
        />
      ),
    },
    {
      key: 'caption',
      label: 'Keterangan',
      render: (row) =>
        row.caption ? (
          <span className="font-medium text-neutral-900">{row.caption}</span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    {
      key: 'url',
      label: 'URL',
      render: (row) => (
        <span className="block max-w-[24rem] truncate font-mono text-xs text-neutral-500">
          {row.url}
        </span>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={editHref(row.index, needle)}
            className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-neutral-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => void handleDelete(row)}
            disabled={busyIndex === row.index}
            className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busyIndex === row.index ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={items}
        total={items.length}
        page={1}
        pageSize={100}
        searchPlaceholder="Cari keterangan atau URL…"
        exportFilename="galeri"
        basePath="/admin/galeri"
      />
    </div>
  )
}
