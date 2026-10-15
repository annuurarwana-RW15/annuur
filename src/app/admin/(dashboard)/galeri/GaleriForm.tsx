'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageField from '@/components/admin/ImageField'
import { saveGaleriItem, type GaleriResult } from './actions'

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-green-900 focus:ring-2 focus:ring-green-900/20'

const labelClass = 'block space-y-1 text-sm font-medium text-neutral-700'

export interface GaleriFormProps {
  /** Null = tambah foto baru. */
  item: { url: string; caption: string } | null
  /** Index array `images` untuk edit; null untuk tambah. */
  index: number | null
  backHref: string
}

export function GaleriForm({ item, index, backHref }: GaleriFormProps) {
  const router = useRouter()
  const [url, setUrl] = useState(item?.url ?? '')
  const [caption, setCaption] = useState(item?.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<GaleriResult | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveGaleriItem({ index, url, caption })
      if (result.ok) {
        router.push(backHref)
        router.refresh()
      } else {
        setFeedback(result)
      }
    } catch (err) {
      setFeedback({
        ok: false,
        error: err instanceof Error ? err.message : 'Gagal menyimpan foto',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">
          {index === null ? 'Foto baru' : 'Edit foto'}
        </h2>
        <Link
          href={backHref}
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>URL gambar</span>
          <input
            type="text"
            value={url}
            required
            placeholder="https://… atau /uploads/…"
            onChange={(event) => setUrl(event.target.value)}
            className={inputClass}
          />
          <span className="block text-xs font-normal text-neutral-500">
            Tempel URL hasil upload di bawah, atau isi manual.
          </span>
        </label>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-neutral-700">
            Atau upload gambar
          </span>
          <ImageField
            value={url || undefined}
            onChange={setUrl}
            prefix="galeri"
            label=""
          />
        </div>

        <label className={`${labelClass} sm:col-span-2`}>
          <span>Keterangan (opsional)</span>
          <input
            type="text"
            value={caption}
            maxLength={120}
            placeholder="Contoh: Renovasi mihrab 2026"
            onChange={(event) => setCaption(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : index === null ? 'Tambah foto' : 'Simpan perubahan'}
        </button>
        <Link
          href={backHref}
          className="text-sm font-medium text-neutral-500 hover:underline"
        >
          Batal
        </Link>
        {feedback && !feedback.ok ? (
          <p role="alert" className="text-sm text-red-600">
            {feedback.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
