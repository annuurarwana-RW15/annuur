'use client'

import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatRupiah } from '@/lib/format'
import type { PublicTransactionRow } from './rows'

interface PublicTransactionTableProps {
  rows: PublicTransactionRow[]
  /** Total baris SETELAH search/sort (untuk pagination DataTable). */
  total: number
  page: number
  pageSize: number
}

/**
 * Pembungkus client untuk daftar transaksi publik: kolom `render` (fungsi + JSX)
 * tidak bisa diserialisasi dari Server Component ke DataTable.
 */
export function PublicTransactionTable({
  rows,
  total,
  page,
  pageSize,
}: PublicTransactionTableProps) {
  const columns: Column<PublicTransactionRow>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (row) => new Date(row.tanggal).toLocaleDateString('id-ID'),
    },
    {
      key: 'jenis',
      label: 'Jenis',
      sortable: true,
      render: (row) =>
        row.jenis === 'MASUK' ? (
          <span className="font-medium text-hijau">Masuk</span>
        ) : (
          <span className="font-medium text-rose-600">Keluar</span>
        ),
    },
    {
      key: 'kategoriName',
      label: 'Kategori',
      sortable: true,
      render: (row) => <span className="text-neutral-800">{row.kategoriName}</span>,
    },
    {
      key: 'nominal',
      label: 'Nominal',
      align: 'right',
      sortable: true,
      render: (row) => formatRupiah(row.nominal),
    },
    {
      key: 'keterangan',
      label: 'Keterangan',
      sortable: true,
      render: (row) => row.keterangan ?? '—',
    },
    {
      key: 'receiptImage',
      label: 'Kwitansi',
      render: (row) =>
        row.receiptImage ? (
          <a
            href={row.receiptImage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-hijau hover:underline"
          >
            Lihat Kwitansi
          </a>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      searchPlaceholder="Cari kategori / keterangan…"
      exportFilename="daftar-transaksi"
      basePath="/laporan-kas/transaksi"
      hideBuiltinActions
    />
  )
}
