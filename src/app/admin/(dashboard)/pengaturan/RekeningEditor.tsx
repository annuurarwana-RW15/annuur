'use client'

import type { ChangeEvent } from 'react'
import { BANK_LIST, type RekeningRow } from './rekening'

const inputClass =
  'w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'

const labelClass = 'block text-xs font-medium text-neutral-500'

export interface RekeningEditorProps {
  rows: RekeningRow[]
  onChange: (next: RekeningRow[]) => void
}

/** Editor daftar rekening donasi menggantikan textarea JSON di Pengaturan. */
export function RekeningEditor({ rows, onChange }: RekeningEditorProps) {
  function updateRow(index: number, patch: Partial<RekeningRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/15 px-3 py-2 text-xs text-neutral-500">
          Belum ada rekening.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 bg-neutral-50/60 p-2"
            >
              <label className="w-full space-y-1 sm:w-40">
                <span className={labelClass}>Bank</span>
                <input
                  type="text"
                  list="bank-list"
                  value={row.bank}
                  placeholder="BCA"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { bank: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="w-full space-y-1 sm:w-52">
                <span className={labelClass}>No. Rekening</span>
                <input
                  type="text"
                  value={row.no}
                  placeholder="1234567890"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { no: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="w-full space-y-1 sm:w-52">
                <span className={labelClass}>Atas Nama</span>
                <input
                  type="text"
                  value={row.atasNama}
                  placeholder="DKM An-nuur"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { atasNama: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                <span className={labelClass}>Tautan (opsional)</span>
                <input
                  type="text"
                  value={row.link ?? ''}
                  placeholder="https://…"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { link: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, { bank: '', no: '', atasNama: '', link: '' }])}
        className="rounded-md border border-green-900 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
      >
        + Tambah rekening
      </button>

      <datalist id="bank-list">
        {BANK_LIST.map((bank) => (
          <option key={bank} value={bank} />
        ))}
      </datalist>
    </div>
  )
}
