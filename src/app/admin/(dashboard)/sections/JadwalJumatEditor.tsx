'use client'

import type { ChangeEvent } from 'react'
import { parseJumatItems, type JumatRow } from './jumat-items'

const inputClass =
  'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'

const labelClass = 'block text-xs font-medium text-neutral-500'

export interface JadwalJumatEditorProps {
  /** Nilai draft JSON (string) — dikirim ulang setiap baris berubah. */
  value: string
  onChange: (nextJson: string) => void
  helper?: string
}

/**
 * Editor daftar jadwal khotib Jumat menggantikan textarea JSON:
 * tiap baris = tanggal (date picker) + khotib + imam, bisa ditambah/dihapus.
 * Nilai yang dipertukarkan tetap JSON array {tanggal,khatib,imam}.
 */
export function JadwalJumatEditor({ value, onChange, helper }: JadwalJumatEditorProps) {
  const rows = parseJumatItems(value)

  function emit(next: JumatRow[]) {
    onChange(JSON.stringify(next, null, 2))
  }

  function updateRow(index: number, patch: Partial<JumatRow>) {
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">
        Jadwal khotib Jumat
      </span>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/15 px-3 py-2 text-xs text-neutral-500">
          Belum ada jadwal.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 bg-neutral-50/60 p-2"
            >
              <label className="w-full space-y-1 sm:w-44">
                <span className={labelClass}>Tanggal (Jumat)</span>
                <input
                  type="date"
                  value={row.tanggal}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { tanggal: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="w-full space-y-1 sm:w-52">
                <span className={labelClass}>Khotib</span>
                <input
                  type="text"
                  value={row.khatib}
                  placeholder="Ust. …"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { khatib: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                <span className={labelClass}>Imam (opsional)</span>
                <input
                  type="text"
                  value={row.imam}
                  placeholder="Ust. …"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { imam: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => emit(rows.filter((_, i) => i !== index))}
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => emit([...rows, { tanggal: '', khatib: '', imam: '' }])}
        className="rounded-md border border-green-900 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
      >
        + Tambah jadwal
      </button>

      {helper ? <p className="text-xs text-neutral-500">{helper}</p> : null}
    </div>
  )
}
