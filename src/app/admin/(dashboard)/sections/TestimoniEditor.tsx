'use client'

import type { ChangeEvent } from 'react'
import { parseTestimoniItems, type TestimoniRow } from './testimoni-items'

const inputClass =
  'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'

const labelClass = 'block text-xs font-medium text-neutral-500'

export interface TestimoniEditorProps {
  /** Nilai draft JSON (string) — dikirim ulang setiap baris berubah. */
  value: string
  onChange: (nextJson: string) => void
  helper?: string
}

/**
 * Editor daftar testimoni menggantikan textarea JSON:
 * tiap baris = nama + peran + rating (opsional) + teks, bisa ditambah/dihapus.
 * Nilai yang dipertukarkan tetap JSON array {nama,peran,teks,rating}.
 */
export function TestimoniEditor({ value, onChange, helper }: TestimoniEditorProps) {
  const rows = parseTestimoniItems(value)

  function emit(next: TestimoniRow[]) {
    onChange(JSON.stringify(next, null, 2))
  }

  function updateRow(index: number, patch: Partial<TestimoniRow>) {
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">Testimoni</span>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/15 px-3 py-2 text-xs text-neutral-500">
          Belum ada testimoni.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 bg-neutral-50/60 p-2"
            >
              <label className="w-full space-y-1 sm:w-48">
                <span className={labelClass}>Nama</span>
                <input
                  type="text"
                  value={row.nama}
                  placeholder="Nama jamaah"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { nama: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="w-full space-y-1 sm:w-44">
                <span className={labelClass}>Peran (opsional)</span>
                <input
                  type="text"
                  value={row.peran}
                  placeholder="Jamaah"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { peran: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="w-full space-y-1 sm:w-36">
                <span className={labelClass}>Rating (opsional)</span>
                <select
                  value={row.rating ?? ''}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateRow(index, {
                      rating: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Tanpa rating</option>
                  <option value="1">★</option>
                  <option value="2">★★</option>
                  <option value="3">★★★</option>
                  <option value="4">★★★★</option>
                  <option value="5">★★★★★</option>
                </select>
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                <span className={labelClass}>Teks</span>
                <textarea
                  value={row.teks}
                  rows={2}
                  placeholder="Ceritakan pengalaman…"
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    updateRow(index, { teks: event.target.value })
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
        onClick={() => emit([...rows, { nama: '', peran: '', teks: '', rating: null }])}
        className="rounded-md border border-green-900 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
      >
        + Tambah testimoni
      </button>

      {helper ? <p className="text-xs text-neutral-500">{helper}</p> : null}
    </div>
  )
}
