'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InventoryCategoryType, InventoryItem } from '@prisma/client'
import { saveInventoryItem } from './actions'
import type { ItemInput } from './schema'

const CATEGORIES: { value: InventoryCategoryType; label: string }[] = [
  { value: 'SARPRAS_UMUM', label: 'Sarpras Umum (Tenda, Kursi, Terpal)' },
  { value: 'ELEKTRONIK_AUDIO', label: 'Elektronik & Audio (Sound, Mic, Genset)' },
  { value: 'IBADAH_PENGAJIAN', label: 'Ibadah & Pengajian (Al-Quran, Rehal, Proyektor)' },
  { value: 'RUKUN_KEMATIAN', label: 'Rukun Kematian (Perlengkapan Jenazah)' },
  { value: 'KEBERSIHAN_DAPUR', label: 'Kebersihan & Dapur (Kompor, Mesin Cuci Karpet)' },
]

export function ItemForm({ item }: { item?: InventoryItem }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [code, setCode] = useState(item?.code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<InventoryCategoryType>(
    item?.category ?? 'SARPRAS_UMUM',
  )
  const [location, setLocation] = useState(item?.location ?? '')
  const [isBorrowable, setIsBorrowable] = useState(item?.isBorrowable ?? true)
  const [totalQty, setTotalQty] = useState(item?.totalQty ? String(item.totalQty) : '1')
  const [isWaqf, setIsWaqf] = useState(item?.isWaqf ?? false)
  const [waqfDonor, setWaqfDonor] = useState(item?.waqfDonor ?? '')
  const [priceEstimate, setPriceEstimate] = useState(
    item?.priceEstimate ? String(item.priceEstimate) : '',
  )
  const [notes, setNotes] = useState(item?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload: ItemInput = {
      id: item?.id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      location: location.trim(),
      isBorrowable,
      totalQty: Math.max(0, parseInt(totalQty, 10) || 0),
      isWaqf,
      waqfDonor: isWaqf ? waqfDonor.trim() : null,
      priceEstimate: priceEstimate ? parseFloat(priceEstimate) : null,
      notes: notes.trim() || null,
    }

    const res = await saveInventoryItem(payload)
    setLoading(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    router.push('/admin/inventaris')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
    >
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Kode Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: INV-TND-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InventoryCategoryType)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Nama Barang <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Kursi Lipat Hijau Napolly"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Lokasi Penyimpanan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Gudang Belakang Lt. 1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Total Stok Unit <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={totalQty}
              onChange={(e) => setTotalQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isBorrowable"
              checked={isBorrowable}
              onChange={(e) => setIsBorrowable(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-green-900 focus:ring-green-800"
            />
            <label htmlFor="isBorrowable" className="text-sm font-medium text-neutral-900">
              Dapat dipinjamkan ke warga / jamaah
            </label>
          </div>
          <p className="mt-1 text-xs text-neutral-500 ps-7">
            Hapus centang untuk aset khusus ibadah/operasional inti (seperti karpet mihrab, sound ruang utama, atau brankas).
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isWaqf"
              checked={isWaqf}
              onChange={(e) => setIsWaqf(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-green-900 focus:ring-green-800"
            />
            <label htmlFor="isWaqf" className="text-sm font-medium text-neutral-900">
              Barang merupakan Wakaf / Hibah Jamaah
            </label>
          </div>
          {isWaqf && (
            <div className="mt-3 ps-7">
              <label className="block text-xs font-medium text-neutral-700">
                Nama Pewakaf / Donatur
              </label>
              <input
                type="text"
                placeholder="Contoh: H. Suparman / Hamba Allah"
                value={waqfDonor}
                onChange={(e) => setWaqfDonor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Nilai / Estimasi Harga Satuan (Opsional)
          </label>
          <input
            type="number"
            min="0"
            placeholder="Contoh: 150000"
            value={priceEstimate}
            onChange={(e) => setPriceEstimate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Catatan Tambahan
          </label>
          <textarea
            rows={2}
            placeholder="Catatan kondisi, merk, spesifikasi teknis..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => router.push('/admin/inventaris')}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-900 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : item ? 'Simpan Perubahan' : 'Tambah Barang'}
        </button>
      </div>
    </form>
  )
}

