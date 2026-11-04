'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InventoryItem } from '@prisma/client'
import { createLoan } from '../../actions'
import type { CreateLoanInput } from '../../schema'

export function LoanForm({
  availableItems,
}: {
  availableItems: InventoryItem[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerPhone, setBorrowerPhone] = useState('')
  const [borrowerAddress, setBorrowerAddress] = useState('')
  const [purpose, setPurpose] = useState('')
  const [loanDate, setLoanDate] = useState(todayStr)
  const [expectedReturn, setExpectedReturn] = useState('')
  const [officerOut, setOfficerOut] = useState('')
  const [notes, setNotes] = useState('')

  // Multi-item selector state
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; borrowedQty: number }[]
  >([{ itemId: availableItems[0]?.id ?? '', borrowedQty: 1 }])

  function addItemRow() {
    setSelectedItems((prev) => [
      ...prev,
      { itemId: availableItems[0]?.id ?? '', borrowedQty: 1 },
    ])
  }

  function removeItemRow(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItemRow(
    index: number,
    field: 'itemId' | 'borrowedQty',
    value: string | number,
  ) {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          [field]: field === 'borrowedQty' ? Math.max(1, Number(value)) : value,
        }
      }),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (selectedItems.length === 0) {
      setError('Pilih minimal 1 barang untuk dipinjam')
      setLoading(false)
      return
    }

    const payload: CreateLoanInput = {
      borrowerName: borrowerName.trim(),
      borrowerPhone: borrowerPhone.trim(),
      borrowerAddress: borrowerAddress.trim() || null,
      purpose: purpose.trim(),
      loanDate,
      expectedReturn,
      officerOut: officerOut.trim(),
      notes: notes.trim() || null,
      items: selectedItems,
    }

    const res = await createLoan(payload)
    setLoading(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    router.push('/admin/inventaris/peminjaman')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 max-w-3xl rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
    >
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Identitas Peminjam */}
        <div>
          <h2 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
            1. Data Peminjam
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Nama Peminjam <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Bpk. Bambang Sutrisno"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                No. Telepon / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 081298765432"
                value={borrowerPhone}
                onChange={(e) => setBorrowerPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700">
                Alamat Warga / Lingkungan RT & RW
              </label>
              <input
                type="text"
                placeholder="Contoh: Jl. Arwana 3 No. 12, RT 02 / RW 15"
                value={borrowerAddress}
                onChange={(e) => setBorrowerAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700">
                Tujuan / Acara Penggunaan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Pengajian Rutin Ibu-Ibu RT 02 / Tasyakuran Khitanan"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Waktu & Petugas PIC */}
        <div>
          <h2 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
            2. Jadwal & Petugas Serah Terima
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Tanggal Pinjam <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Rencana Kembali <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={loanDate}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Petugas PIC Penyerah <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nama marbot / pengurus"
                value={officerOut}
                onChange={(e) => setOfficerOut(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Pemilihan Barang */}
        <div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h2 className="text-base font-semibold text-neutral-900">
              3. Daftar Barang yang Dipinjam
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="text-xs font-semibold text-green-900 hover:underline"
            >
              + Tambah Baris Barang
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {availableItems.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Tidak ada barang yang siap dipinjam saat ini.
              </p>
            ) : (
              selectedItems.map((selected, idx) => {
                const currentItem = availableItems.find(
                  (i) => i.id === selected.itemId,
                )
                const maxAvailable = currentItem?.availableQty ?? 1

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <select
                        value={selected.itemId}
                        onChange={(e) =>
                          updateItemRow(idx, 'itemId', e.target.value)
                        }
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
                      >
                        {availableItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            [{item.code}] {item.name} — Tersedia: {item.availableQty}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Jumlah:</span>
                      <input
                        type="number"
                        min="1"
                        max={maxAvailable}
                        value={selected.borrowedQty}
                        onChange={(e) =>
                          updateItemRow(
                            idx,
                            'borrowedQty',
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className="w-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-bold text-neutral-900"
                      />
                      <span className="text-xs text-neutral-400">
                        / maks {maxAvailable}
                      </span>
                    </div>

                    {selectedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="block text-xs font-medium text-neutral-700">
            Catatan Serah Terima / Kondisi Awal
          </label>
          <textarea
            rows={2}
            placeholder="Catatan kelengkapan kabel, kebersihan tenda, atau perjanjian khusus..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => router.push('/admin/inventaris/peminjaman')}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || availableItems.length === 0}
          className="rounded-lg bg-green-900 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan & Terbitkan Peminjaman'}
        </button>
      </div>
    </form>
  )
}

