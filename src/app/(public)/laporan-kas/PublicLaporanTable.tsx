'use client'

import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatRupiah } from '@/lib/format'

export interface PublicLaporanRow {
  categoryId: string
  categoryName: string
  masuk: number
  keluar: number
  saldo: number
  terbarik: string | null
}

interface PublicLaporanTableProps {
  rows: PublicLaporanRow[]
  activeCategoryId?: string
}

/**
 * Pembungkus client untuk laporan kas publik: kolom `render` (fungsi + JSX)
 * tidak bisa diserialisasi dari Server Component ke DataTable.
 */
export function PublicLaporanTable({ rows, activeCategoryId }: PublicLaporanTableProps) {
  const columns: Column<PublicLaporanRow>[] = [
    {
      key: 'categoryName',
      label: 'Kategori',
      sortable: true,
      render: (row) =>
        row.categoryId === activeCategoryId ? (
          <span className="font-semibold text-hijau">{row.categoryName}</span>
        ) : (
          <span className="text-neutral-800">{row.categoryName}</span>
        ),
    },
    {
      key: 'masuk',
      label: 'Masuk',
      align: 'right',
      render: (row) => formatRupiah(row.masuk),
    },
    {
      key: 'keluar',
      label: 'Keluar',
      align: 'right',
      render: (row) => formatRupiah(row.keluar),
    },
    {
      key: 'saldo',
      label: 'Saldo',
      align: 'right',
      render: (row) => (
        <span className={row.saldo < 0 ? 'text-rose-600' : undefined}>
          {formatRupiah(row.saldo)}
        </span>
      ),
    },
    {
      key: 'terbarik',
      label: 'Tanggal update',
      render: (row) =>
        row.terbarik
          ? new Date(row.terbarik).toLocaleDateString('id-ID')
          : '—',
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <Link
          href={`/laporan-kas?kategori=${row.categoryId}`}
          className="text-sm font-medium text-hijau hover:underline"
        >
          Detail
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={rows.length}
      page={1}
      pageSize={100}
      searchPlaceholder="Cari kategori…"
      exportFilename="laporan-kas"
      basePath="/laporan-kas"
      hideBuiltinActions
    />
  )
}
