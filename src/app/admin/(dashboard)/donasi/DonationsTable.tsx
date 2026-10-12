'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DonationStatus } from '@prisma/client'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID, formatRupiah } from '@/lib/format'
import { buildTableHref, type HrefPatch } from '@/lib/table-query'
import { verifyDonation } from './actions'

const BASE_PATH = '/admin/donasi'

const STATUS_BADGE: Record<DonationStatus, string> = {
  MENUNGGU: 'bg-amber-100 text-amber-800',
  DIKONFIRMASI: 'bg-green-100 text-green-800',
  DITOLAK: 'bg-red-100 text-red-800',
}

/** Baris serializable — server map Decimal → number sebelum dikirim ke client. */
export interface DonationRow {
  id: string
  donorName: string
  amount: number
  reference: string
  status: DonationStatus
  message: string | null
  proofImage: string | null
  categoryName: string | null
  verifiedByName: string | null
  verifiedAt: Date | null
  rejectNote: string | null
  createdAt: Date
}

interface DonationsTableProps {
  /** Baris halaman ini (sudah difilter & dipaginasi di server). */
  rows: DonationRow[]
  total: number
  page: number
  pageSize: number
  status: DonationStatus | 'SEMUA'
}

const panelClass =
  'fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-black/10 bg-white p-5 shadow-xl'

/**
 * Pembungkus client: kolom berisi `render` (fungsi) tidak bisa diserialisasi
 * dari Server Component — definisi kolom wajib hidup di lapisan client
 * (pola `artikel/ArticlesTable` dengan paginasi & filter server sungguhan).
 */
export function DonationsTable({
  rows,
  total,
  page,
  pageSize,
  status,
}: DonationsTableProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectRow, setRejectRow] = useState<DonationRow | null>(null)
  const [detailRow, setDetailRow] = useState<DonationRow | null>(null)

  async function handleConfirm(row: DonationRow) {
    const confirmed = window.confirm(
      `Konfirmasi donasi ${formatRupiah(row.amount)} dari ${row.donorName}? Akan tercatat sebagai transaksi masuk.`,
    )
    if (!confirmed) return

    setBusyId(row.id)
    setError(null)
    try {
      const result = await verifyDonation(row.id, 'confirm')
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses donasi')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(row: DonationRow, note: string) {
    setBusyId(row.id)
    setError(null)
    try {
      const result = await verifyDonation(row.id, 'reject', note)
      if (result.ok) {
        setRejectRow(null)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menolak donasi')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<DonationRow>[] = [
    {
      key: 'createdAt',
      label: 'Tanggal',
      render: (row) => formatDateID(row.createdAt),
    },
    {
      key: 'donorName',
      label: 'Donatur',
      render: (row) => (
        <div>
          <span className="font-medium text-neutral-900">{row.donorName}</span>
          <p className="text-xs text-neutral-400">{row.reference}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Jumlah',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-neutral-900">
          {formatRupiah(row.amount)}
        </span>
      ),
    },
    {
      key: 'categoryName',
      label: 'Kategori',
      render: (row) =>
        row.categoryName ?? <span className="text-neutral-400">—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}
          >
            {row.status}
          </span>
          {row.status !== 'MENUNGGU' ? (
            <p className="mt-1 max-w-[14rem] text-xs text-neutral-500">
              {row.verifiedByName ? `oleh ${row.verifiedByName}` : null}
              {row.verifiedAt ? `, ${formatDateID(row.verifiedAt)}` : null}
              {row.status === 'DITOLAK' && row.rejectNote
                ? ` — ${row.rejectNote}`
                : null}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'MENUNGGU' ? (
            <>
              <button
                type="button"
                onClick={() => void handleConfirm(row)}
                disabled={busyId === row.id}
                className="inline-flex items-center rounded-md bg-green-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {busyId === row.id ? 'Memproses…' : 'Konfirmasi'}
              </button>
              <button
                type="button"
                onClick={() => setRejectRow(row)}
                disabled={busyId === row.id}
                className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Tolak
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setDetailRow(row)}
            className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-neutral-50"
          >
            Detail
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
        searchPlaceholder="Cari donatur atau referensi…"
        exportFilename="donasi"
        basePath={BASE_PATH}
        toolbarExtra={<StatusFilter current={status} />}
      />
      {rejectRow ? (
        <RejectDialog
          row={rejectRow}
          busy={busyId === rejectRow.id}
          onSubmit={(note) => void handleReject(rejectRow, note)}
          onClose={() => setRejectRow(null)}
        />
      ) : null}
      {detailRow ? (
        <DetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  )
}

/** Filter status di luar q/sort: menulis URL `status` & me-reset page=1. */
function StatusFilter({
  current,
}: {
  current: DonationStatus | 'SEMUA'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const href = (patch: HrefPatch) => buildTableHref(BASE_PATH, searchParams, patch)

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-neutral-500">Status</span>
      <select
        value={current}
        aria-label="Filter status"
        onChange={(event) =>
          router.replace(
            href({
              // SEMUA disimpan eksplisit; MENUNGGU = default tanpa param.
              status:
                event.target.value === 'MENUNGGU'
                  ? undefined
                  : event.target.value,
              page: 1,
            }),
          )
        }
        className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-neutral-700"
      >
        <option value="SEMUA">Semua</option>
        <option value="MENUNGGU">Menunggu</option>
        <option value="DIKONFIRMASI">Dikonfirmasi</option>
        <option value="DITOLAK">Ditolak</option>
      </select>
    </label>
  )
}

/** Dialog tolak: catatan wajib 2–300 karakter (submit disabled < 2). */
function RejectDialog({
  row,
  busy,
  onSubmit,
  onClose,
}: {
  row: DonationRow
  busy: boolean
  onSubmit: (note: string) => void
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const valid = note.trim().length >= 2 && note.length <= 300

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tolak donasi dari ${row.donorName}`}
      className={panelClass}
    >
      <h2 className="text-lg font-semibold text-neutral-900">Tolak donasi</h2>
      <p className="mt-1 text-sm text-neutral-600">
        {row.donorName} — {formatRupiah(row.amount)} ({row.reference})
      </p>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-neutral-700">
          Catatan penolakan <span className="text-red-600">*</span>
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Contoh: bukti transfer tidak ditemukan"
          className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40"
        />
      </label>
      <p className="mt-1 text-xs text-neutral-400">{note.trim().length}/300</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => onSubmit(note.trim())}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? 'Menolak…' : 'Tolak donasi'}
        </button>
      </div>
    </div>
  )
}

/** Detail ringkas: bukti, pesan, referensi & jejak verifikasi. */
function DetailDialog({
  row,
  onClose,
}: {
  row: DonationRow
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail donasi ${row.reference}`}
      className={panelClass}
    >
      <h2 className="text-lg font-semibold text-neutral-900">
        Detail donasi {row.reference}
      </h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Donatur</dt>
          <dd className="font-medium text-neutral-900">{row.donorName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Jumlah</dt>
          <dd className="font-medium tabular-nums text-neutral-900">
            {formatRupiah(row.amount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Kategori</dt>
          <dd className="text-neutral-900">{row.categoryName ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Dikirim</dt>
          <dd className="text-neutral-900">{formatDateID(row.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Status</dt>
          <dd>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}
            >
              {row.status}
            </span>
          </dd>
        </div>
        {row.verifiedAt ? (
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Diverifikasi</dt>
            <dd className="text-neutral-900">
              {row.verifiedByName ?? '—'}, {formatDateID(row.verifiedAt)}
            </dd>
          </div>
        ) : null}
      </dl>
      {row.message ? (
        <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          “{row.message}”
        </p>
      ) : null}
      {row.status === 'DITOLAK' && row.rejectNote ? (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          Catatan penolakan: {row.rejectNote}
        </p>
      ) : null}
      {row.proofImage ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- bukti transfer dari penyimpanan eksternal (R2), di luar image optimizer */}
          <img
            src={row.proofImage}
            alt={`Bukti transfer ${row.reference}`}
            className="max-h-64 w-full rounded-lg border border-black/10 object-contain"
          />
          <a
            href={row.proofImage}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-green-900 hover:underline"
          >
            Buka bukti ↗
          </a>
        </div>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">Tanpa bukti transfer.</p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}
