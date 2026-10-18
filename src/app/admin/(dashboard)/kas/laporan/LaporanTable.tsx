'use client'

import { useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatRupiah } from '@/lib/format'
import type { KasReportRow } from '@/lib/report'
import { exportKasReport, type ExportFormat } from './actions'

const BASE_PATH = '/admin/kas/laporan'

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40 disabled:opacity-60'

interface LaporanTableProps {
  /** Potongan baris halaman ini (slice & sort sudah di server). */
  rows: KasReportRow[]
  total: number
  page: number
  pageSize: number
  periodId: string
  categoryId?: string
}

function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Cabut tertunda: mencabut sinkron tepat setelah click() membatalkan
  // unduhan di sebagian browser (Pola sama dengan DataTable & JurnalTable).
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Pembungkus client: tombol ekspor memanggil server action (data agregat
 * lengkap + TOTAL, bukan potongan halaman yang terlihat di layar).
 */
export function LaporanTable({
  rows,
  total,
  page,
  pageSize,
  periodId,
  categoryId,
}: LaporanTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  async function handleExport(format: ExportFormat) {
    setBusy(format)
    setError(null)
    try {
      const result = await exportKasReport(format, {
        periodId,
        ...(categoryId ? { categoryId } : {}),
      })
      if (result.ok) download(result.filename, result.content, result.mime)
      else setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor laporan')
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<KasReportRow>[] = [
    { key: 'kategori', label: 'Kategori', sortable: true },
    {
      key: 'masuk',
      label: 'Masuk',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-medium text-green-700">{formatRupiah(row.masuk)}</span>
      ),
    },
    {
      key: 'keluar',
      label: 'Keluar',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-medium text-red-600">{formatRupiah(row.keluar)}</span>
      ),
    },
    {
      key: 'saldo',
      label: 'Saldo',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-medium">{formatRupiah(row.saldo)}</span>,
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
        searchPlaceholder="Cari kategori…"
        exportFilename="laporan-kas"
        basePath={BASE_PATH}
        toolbarExtra={toolbarExtra}
        hideBuiltinActions
      />
    </div>
  )
}
