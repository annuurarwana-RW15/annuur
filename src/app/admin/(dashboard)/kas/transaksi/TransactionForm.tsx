'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CategoryType } from '@prisma/client'
import ImageField from '@/components/admin/ImageField'
import {
  fieldClass,
  helperClass,
  labelClass,
} from '@/app/admin/(dashboard)/artikel/field-styles'
import { formatRupiah, parseRupiah } from '@/lib/format'
import { createTransaction, updateTransaction } from './actions'

const TX_TYPES = ['MASUK', 'KELUAR'] as const

interface EditableTransaction {
  id: string
  type: 'MASUK' | 'KELUAR'
  amount: number
  /** YYYY-MM-DD (sudah diformat di server). */
  date: string
  description: string
  categoryId: string
  receiptImage: string | null
}

interface TransactionFormProps {
  /** Ada = mode edit (id ikut dikirim ke `updateTransaction`). */
  transaction?: EditableTransaction
  categories: { id: string; name: string; type: CategoryType; isActive: boolean }[]
}

function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function TransactionForm({
  transaction,
  categories,
}: TransactionFormProps) {
  const router = useRouter()
  const isEdit = Boolean(transaction)

  const [tanggal, setTanggal] = useState(transaction?.date ?? todayISO())
  const [type, setType] = useState<(typeof TX_TYPES)[number]>(
    transaction?.type ?? 'MASUK',
  )
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [nominal, setNominal] = useState(
    transaction ? formatRupiah(transaction.amount) : '',
  )
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [receiptImage, setReceiptImage] = useState(
    transaction?.receiptImage ?? '',
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null)

  // Kategori aktif sesuai jenis dipilih; kategori terpilih tetap tampil saat edit.
  const visibleCategories = categories.filter(
    (category) =>
      (category.isActive && category.type === type) ||
      category.id === categoryId,
  )

  function handleTypeChange(next: (typeof TX_TYPES)[number]) {
    setType(next)
    // Kategori harus cocok dengan jenis — reset pilihan lama.
    const current = categories.find((category) => category.id === categoryId)
    if (!current || current.type !== next) setCategoryId('')
  }

  function formatNominalOnBlur() {
    const trimmed = nominal.trim()
    if (!trimmed) return
    const parsed = parseRupiah(trimmed)
    if (Number.isFinite(parsed) && parsed > 0) setNominal(formatRupiah(parsed))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setSaving(true)
    try {
      const payload = {
        type,
        amount: parseRupiah(nominal),
        date: tanggal,
        description,
        categoryId,
        receiptImage,
      }
      const result = transaction
        ? await updateTransaction(transaction.id, payload)
        : await createTransaction(payload)
      if (result.ok) {
        router.push('/admin/kas/transaksi')
        router.refresh()
      } else {
        setFeedback({ kind: 'err', message: result.error })
      }
    } catch (err) {
      setFeedback({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Gagal menyimpan transaksi',
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
          {isEdit ? 'Edit transaksi' : 'Transaksi baru'}
        </h2>
        <Link
          href="/admin/kas/transaksi"
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={labelClass}>Tanggal</span>
          <input
            type="date"
            value={tanggal}
            required
            onChange={(event) => setTanggal(event.target.value)}
            className={fieldClass}
          />
          <p className={helperClass}>Wajib — menentukan urutan pada daftar.</p>
        </label>

        <div className="space-y-1">
          <span className={labelClass}>Jenis</span>
          <div className="flex items-center gap-4 pt-1.5">
            {TX_TYPES.map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value={value}
                  checked={type === value}
                  onChange={() => handleTypeChange(value)}
                  className="h-4 w-4 border-black/20 text-green-900 focus:ring-green-900/40"
                />
                <span className="text-sm font-medium text-neutral-700">
                  {value === 'MASUK' ? 'Masuk' : 'Keluar'}
                </span>
              </label>
            ))}
          </div>
          <p className={helperClass}>
            {type === 'MASUK' ? 'Pemasukan kas.' : 'Pengeluaran kas.'}
          </p>
        </div>

        <label className="block space-y-1">
          <span className={labelClass}>Kategori</span>
          <select
            value={categoryId}
            required
            onChange={(event) => setCategoryId(event.target.value)}
            className={fieldClass}
          >
            <option value="">— Pilih kategori —</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (nonaktif)'}
              </option>
            ))}
          </select>
          {visibleCategories.length === 0 ? (
            <p className={helperClass}>
              Belum ada kategori {type.toLowerCase()} — buat dulu di halaman
              kategori kas.
            </p>
          ) : (
            <p className={helperClass}>Wajib dipilih.</p>
          )}
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Nominal (Rp)</span>
          <input
            type="text"
            inputMode="numeric"
            value={nominal}
            required
            placeholder="Contoh: 150000"
            onChange={(event) => setNominal(event.target.value)}
            onBlur={formatNominalOnBlur}
            className={fieldClass}
          />
          <p className={helperClass}>
            Wajib lebih dari 0. Otomatis diformat Rp saat field ditinggalkan.
          </p>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClass}>Keterangan</span>
          <input
            type="text"
            value={description}
            required
            maxLength={200}
            placeholder="Contoh: Infak jamaah shalat Jumat"
            onChange={(event) => setDescription(event.target.value)}
            className={fieldClass}
          />
          <p className={helperClass}>Wajib, maksimal 200 karakter.</p>
        </label>

        <div className="sm:col-span-2">
          <ImageField
            value={receiptImage || undefined}
            onChange={setReceiptImage}
            prefix="kas"
            label="Foto bukti (opsional)"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan transaksi'}
        </button>
        <Link
          href="/admin/kas/transaksi"
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
