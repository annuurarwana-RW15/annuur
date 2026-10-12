'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Period } from '@prisma/client'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID } from '@/lib/format'
import { fieldClass, helperClass, labelClass } from '@/app/admin/(dashboard)/artikel/field-styles'
import { closePeriod, openPeriod } from './actions'

interface PeriodeTableProps {
  /** Baris halaman ini (sudah difilter & dipaginasi di server). */
  rows: Period[]
  total: number
  page: number
  pageSize: number
  /** id pengguna → nama (untuk menampilkan "Ditutup oleh"). */
  userNameById: Record<string, string>
}

const STATUS_BADGE: Record<Period['status'], string> = {
  AKTIF: 'bg-green-100 text-green-800',
  DITUTUP: 'bg-neutral-100 text-neutral-500',
}

/**
 * Pembungkus client (pola `artikel/ArticlesTable`): kolom berisi `render` dan
 * panel "Buka Periode Baru" butuh state client; query tetap di server page.
 */
export function PeriodeTable({
  rows,
  total,
  page,
  pageSize,
  userNameById,
}: PeriodeTableProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    // Nama 4-digit tahun → prefill 1 Jan – 31 Des tahun tersebut.
    if (/^\d{4}$/.test(value.trim())) {
      const year = value.trim()
      setStartDate(`${year}-01-01`)
      setEndDate(`${year}-12-31`)
    }
  }

  async function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await openPeriod({ name, startDate, endDate })
      if (result.ok) {
        setShowForm(false)
        setName('')
        setStartDate('')
        setEndDate('')
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka periode')
    } finally {
      setSaving(false)
    }
  }

  async function handleClose(row: Period) {
    const confirmed = window.confirm(
      `Tutup periode ${row.name}? Transaksi tidak bisa diubah setelah ditutup.`,
    )
    if (!confirmed) return

    setBusyId(row.id)
    setError(null)
    try {
      const result = await closePeriod(row.id)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menutup periode')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Period>[] = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: (row) => <span className="font-medium text-neutral-900">{row.name}</span>,
    },
    {
      key: 'startDate',
      label: 'Rentang',
      sortable: true,
      render: (row) => `${formatDateID(row.startDate)} – ${formatDateID(row.endDate)}`,
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
      key: 'closedAt',
      label: 'Ditutup',
      sortable: true,
      render: (row) =>
        row.closedAt ? (
          <div>
            <p className="text-neutral-800">
              {row.closedBy ? userNameById[row.closedBy] ?? row.closedBy : '—'}
            </p>
            <p className="text-xs text-neutral-400">{formatDateID(row.closedAt)}</p>
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) =>
        row.status === 'AKTIF' ? (
          <button
            type="button"
            onClick={() => void handleClose(row)}
            disabled={busyId === row.id}
            className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busyId === row.id ? 'Menutup…' : 'Tutup'}
          </button>
        ) : (
          <span className="text-neutral-400">—</span>
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

      {showForm ? (
        <form
          onSubmit={handleOpen}
          className="space-y-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">Buka periode baru</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              Batal
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className={labelClass}>Nama periode</span>
              <input
                type="text"
                value={name}
                required
                maxLength={20}
                placeholder="2027"
                onChange={(event) => handleNameChange(event.target.value)}
                className={fieldClass}
              />
              <p className={helperClass}>
                Isi tahun (mis. 2027) — tanggal otomatis 1 Jan – 31 Des.
              </p>
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>Tanggal mulai</span>
              <input
                type="date"
                value={startDate}
                required
                onChange={(event) => setStartDate(event.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>Tanggal selesai</span>
              <input
                type="date"
                value={endDate}
                required
                onChange={(event) => setEndDate(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="flex items-center gap-3 border-t border-black/5 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'Membuka…' : 'Buka periode'}
            </button>
            <p className="text-xs text-neutral-500">
              Periode baru langsung berstatus AKTIF — periode lama harus ditutup
              dahulu.
            </p>
          </div>
        </form>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          searchPlaceholder="Cari nama periode…"
          exportFilename="periode-kas"
          basePath="/admin/kas/periode"
          toolbarExtra={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-md border-green-900 bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              + Buka Periode Baru
            </button>
          }
        />
      )}
    </div>
  )
}
