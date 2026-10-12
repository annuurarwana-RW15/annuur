'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Category } from '@prisma/client'
import { fieldClass, helperClass, labelClass } from '@/app/admin/(dashboard)/artikel/field-styles'
import { saveCategory } from './actions'

const CATEGORY_TYPES = ['MASUK', 'KELUAR'] as const

interface CategoryFormProps {
  /** Ada = mode edit (id ikut dikirim ke `saveCategory`). */
  category?: Category
}

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter()
  const isEdit = Boolean(category)

  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<(typeof CATEGORY_TYPES)[number]>(
    category?.type ?? 'MASUK',
  )
  const [color, setColor] = useState(category?.color ?? '')
  const [isActive, setIsActive] = useState(category?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setSaving(true)
    try {
      const result = await saveCategory({
        ...(category ? { id: category.id } : {}),
        name,
        type,
        color,
        isActive,
      })
      if (result.ok) {
        router.push('/admin/kas/kategori')
        router.refresh()
      } else {
        setFeedback({ kind: 'err', message: result.error })
      }
    } catch (err) {
      setFeedback({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Gagal menyimpan kategori',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">
          {isEdit ? 'Edit kategori' : 'Kategori baru'}
        </h2>
        <Link
          href="/admin/kas/kategori"
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClass}>Nama</span>
          <input
            type="text"
            value={name}
            required
            maxLength={60}
            placeholder="Contoh: Infak Jumat"
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
          <p className={helperClass}>Wajib, maksimal 60 karakter.</p>
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Jenis</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className={fieldClass}
          >
            {CATEGORY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className={helperClass}>
            {type === 'MASUK'
              ? 'Muncul di daftar pemasukan kas.'
              : 'Muncul di daftar pengeluaran kas.'}
          </p>
        </label>

        <div className="space-y-1">
          <span className={labelClass}>Warna (opsional)</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pilih warna kategori"
              value={color || '#0f4c3a'}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-black/10 bg-white p-0.5"
            />
            <input
              type="text"
              value={color}
              placeholder="#RRGGBB"
              onChange={(event) => setColor(event.target.value)}
              className={`${fieldClass} w-36`}
            />
            {color ? (
              <button
                type="button"
                onClick={() => setColor('')}
                className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Hapus
              </button>
            ) : null}
          </div>
          <p className={helperClass}>Dipakai sebagai titik warna di daftar.</p>
        </div>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-black/20 text-green-900 focus:ring-green-900/40"
          />
          <span className="text-sm font-medium text-neutral-700">
            Kategori aktif (bisa dipilih pada form transaksi)
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan kategori'}
        </button>
        <Link
          href="/admin/kas/kategori"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          Batal
        </Link>
        {feedback ? (
          <p
            role={feedback.kind === 'ok' ? 'status' : 'alert'}
            className={`text-sm ${feedback.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
