'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAcquisition } from '../actions'

export interface ItemOption {
  id: string
  code: string
  name: string
  totalQty: number
}

export interface CategoryOption {
  id: string
  name: string
}

export interface AcquisitionModalProps {
  items: ItemOption[]
  cashCategories: CategoryOption[]
  onClose: () => void
}

export function AcquisitionModal({
  items,
  cashCategories,
  onClose,
}: AcquisitionModalProps) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [itemId, setItemId] = useState(items[0]?.id || '')
  const [source, setSource] = useState<'PEMBELIAN_KAS' | 'WAKAF_HIBAH'>('PEMBELIAN_KAS')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [donorName, setDonorName] = useState('')
  const [officer, setOfficer] = useState('')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [recordToCash, setRecordToCash] = useState(false)
  const [cashCategoryId, setCashCategoryId] = useState(cashCategories[0]?.id || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCost = typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice * quantity : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!itemId) {
      setError('Pilih barang yang ingin ditambah')
      return
    }
    if (quantity < 1) {
      setError('Kuantitas penambahan minimal 1')
      return
    }
    if (!officer.trim()) {
      setError('Nama petugas penerima wajib diisi')
      return
    }
    if (source === 'PEMBELIAN_KAS' && recordToCash) {
      if (!unitPrice || unitPrice <= 0) {
        setError('Harga satuan wajib diisi bila dicatat ke Buku Kas')
        return
      }
      if (!cashCategoryId) {
        setError('Pilih kategori pengeluaran kas')
        return
      }
    }

    setLoading(true)
    try {
      const res = await createAcquisition({
        itemId,
        quantity,
        source,
        unitPrice: typeof unitPrice === 'number' ? unitPrice : null,
        donorName: source === 'WAKAF_HIBAH' ? donorName : null,
        officer: officer.trim(),
        date,
        notes: notes.trim() || null,
        recordToCash: source === 'PEMBELIAN_KAS' && recordToCash,
        cashCategoryId: source === 'PEMBELIAN_KAS' && recordToCash ? cashCategoryId : null,
      })

      if (!res.ok) {
        setError(res.error || 'Gagal mencatat pengadaan barang')
        return
      }

      router.refresh()
      onClose()
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Catat Pengadaan / Penambahan Stok
            </h3>
            <p className="text-xs text-neutral-500">
              Tambah stok inventaris melalui pembelian kas masjid atau wakaf/hibah jamaah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Pilih Barang */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Pilih Barang <span className="text-red-500">*</span>
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
              required
            >
              <option value="" disabled>
                -- Pilih Barang Inventaris --
              </option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  [{i.code}] {i.name} (Stok Saat Ini: {i.totalQty})
                </option>
              ))}
            </select>
          </div>

          {/* Sumber Pengadaan & Jumlah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Sumber Pengadaan <span className="text-red-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => {
                  const val = e.target.value as 'PEMBELIAN_KAS' | 'WAKAF_HIBAH'
                  setSource(val)
                  if (val === 'WAKAF_HIBAH') {
                    setRecordToCash(false)
                  }
                }}
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
              >
                <option value="PEMBELIAN_KAS">Pembelian Kas DKM</option>
                <option value="WAKAF_HIBAH">Wakaf / Hibah / Donasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Jumlah Masuk (Unit) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                required
              />
            </div>
          </div>

          {/* Kolom Khusus Sumber */}
          {source === 'WAKAF_HIBAH' ? (
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Nama Donatur / Pewakaf
              </label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Contoh: H. Ahmad / Hamba Allah"
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) =>
                  setUnitPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                }
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
              />
              {totalCost > 0 && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Total Biaya: <strong className="text-neutral-900">Rp {totalCost.toLocaleString('id-ID')}</strong>
                </p>
              )}
            </div>
          )}

          {/* Opsi Integrasi Buku Kas (Hanya jika Pembelian Kas) */}
          {source === 'PEMBELIAN_KAS' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordToCash}
                  onChange={(e) => setRecordToCash(e.target.checked)}
                  className="rounded border-neutral-300 text-green-900 focus:ring-green-900"
                />
                <span className="text-xs font-bold text-amber-950">
                  Catat otomatis ke Buku Kas (Pengeluaran)
                </span>
              </label>
              <p className="mt-1 text-[11px] text-amber-800">
                Sistem akan membuat transaksi kas KELUAR otomatis pada periode aktif.
              </p>

              {recordToCash && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-amber-950">
                    Pilih Kategori Kas Pengeluaran <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cashCategoryId}
                    onChange={(e) => setCashCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs"
                    required={recordToCash}
                  >
                    <option value="" disabled>
                      -- Pilih Kategori Pengeluaran --
                    </option>
                    {cashCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Petugas & Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Petugas PIC Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                placeholder="Nama Pengurus DKM"
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Tanggal Pengadaan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                required
              />
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Keterangan / Catatan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nomor nota, toko/vendor, kondisi barang..."
              className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pengadaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

