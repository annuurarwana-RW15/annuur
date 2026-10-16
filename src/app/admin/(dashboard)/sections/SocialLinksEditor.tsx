'use client'

import { useMemo, type ChangeEvent } from 'react'
import {
  parseSocialLinks,
  SOCIAL_PLATFORMS,
  type SocialRow,
} from './social-links'

const inputClass =
  'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'

const labelClass = 'block text-xs font-medium text-neutral-500'

export interface SocialLinksEditorProps {
  /** Nilai draft JSON (string) — dikirim ulang setiap baris berubah. */
  value: string
  onChange: (nextJson: string) => void
  helper?: string
}

/**
 * Editor daftar social media (footer) menggantikan textarea JSON:
 * tiap baris = nama platform + URL, bisa ditambah/dihapus manual.
 * Nilai yang dipertukarkan tetap JSON array {label,url} agar kompatibel
 * dengan renderer publik `socialLinks()`.
 */
export function SocialLinksEditor({ value, onChange, helper }: SocialLinksEditorProps) {
  const rows = useMemo(() => parseSocialLinks(value), [value])

  function emit(next: SocialRow[]) {
    onChange(JSON.stringify(next, null, 2))
  }

  function updateRow(index: number, patch: Partial<SocialRow>) {
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    emit([...rows, { label: '', url: '' }])
  }

  function removeRow(index: number) {
    emit(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">
        Social media
      </span>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/15 px-3 py-2 text-xs text-neutral-500">
          Belum ada social media.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 bg-neutral-50/60 p-2"
            >
              <label className="w-full space-y-1 sm:w-44">
                <span className={labelClass}>Nama</span>
                <input
                  type="text"
                  list="platform-sosial"
                  value={row.label}
                  placeholder="Instagram"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { label: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                <span className={labelClass}>URL</span>
                <input
                  type="text"
                  value={row.url}
                  placeholder="https://instagram.com/masjidannur"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, { url: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
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
        onClick={addRow}
        className="rounded-md border border-green-900 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
      >
        + Tambah social media
      </button>

      <datalist id="platform-sosial">
        {SOCIAL_PLATFORMS.map((platform) => (
          <option key={platform} value={platform} />
        ))}
      </datalist>

      {helper ? <p className="text-xs text-neutral-500">{helper}</p> : null}
    </div>
  )
}
