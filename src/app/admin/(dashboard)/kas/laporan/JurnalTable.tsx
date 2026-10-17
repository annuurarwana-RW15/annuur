'use client'

import { useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID, formatRupiah } from '@/lib/format'
import { exportJurnal, type ExportFormat } from './actions'
import type { JournalEntry, JournalFilter } from '@/lib/jurnal'

const BASE_PATH = '/admin/kas/laporan/jurnal'

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40 disabled:opacity-60'

function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke ditunda: mencabut sinkron setelah click() dapat membatalkan
  // unduhan karena browser belum sempat memulai fetch blob-nya.
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}

interface JurnalTableProps {
  rows: JournalEntry[]
  total: number
  page: number
  pageSize: number
  periodId: string
  filter: JournalFilter
}

/**
 * Pembungkus client. Hanya kolom Tanggal yang sortable — kolom Saldo harus
 * tetap runtut, dan nilainya sudah invarian (tidak dihitung ulang saat sort).
 */
export function JurnalTable({
  rows,
  total,
  page,
  pageSize,
  periodId,
  filter,
}: JurnalTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  async function handleExport(format: ExportFormat) {
    setBusy(format)
    setError(null)
    try {
      const result = await exportJurnal(format, { periodId, filter })
      if (result.ok) download(result.filename, result.content, result.mime)
      else setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor jurnal')
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<JournalEntry>[] = [
    {
      key: 'no',
      label: 'No',
      align: 'right',
      render: (row) => <span className="tabular-nums text-neutral-500">{row.no}</span>,
    },
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (row) => formatDateID(row.tanggal),
    },
    { key: 'description', label: 'Keterangan' },
    { key: 'kategori', label: 'Kategori' },
    {
      key: 'jenis',
      label: 'Jenis',
      render: (row) =>
        row.jenis === 'MASUK' ? (
          <span className="font-medium text-green-700">Masuk</span>
        ) : (
          <span className="font-medium text-red-600">Keluar</span>
        ),
    },
    {
      key: 'masuk',
      label: 'Masuk',
      align: 'right',
      render: (row) =>
        row.masuk > 0 ? (
          <span className="text-green-700">{formatRupiah(row.masuk)}</span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'keluar',
      label: 'Keluar',
      align: 'right',
      render: (row) =>
        row.keluar > 0 ? (
          <span className="text-red-600">{formatRupiah(row.keluar)}</span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'saldo',
      label: 'Saldo',
      align: 'right',
      render: (row) => (
        <span className="font-semibold tabular-nums">{formatRupiah(row.saldo)}</span>
      ),
    },
  ]

  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void handleExport('csv')}
        disabled={busy !== null}
        className={toolbarButtonClass}
      >
        {busy === 'csv' ? 'Mengekspor…' : 'Ekspor CSV'}
      </button>
      <button
        type="button"
        onClick={() => void handleExport('excel')}
        disabled={busy !== null}
        className={toolbarButtonClass}
      >
        {busy === 'excel' ? 'Mengekspor…' : 'Ekspor Excel'}
      </button>
      <button type="button" onClick={() => window.print()} className={toolbarButtonClass}>
        Cetak
      </button>
    </div>
  )

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
        searchPlaceholder="Cari keterangan / kategori…"
        exportFilename="jurnal-kas"
        basePath={BASE_PATH}
        toolbarExtra={toolbarExtra}
        hideBuiltinActions
      />
    </div>
  )
}
