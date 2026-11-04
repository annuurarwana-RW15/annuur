'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordReturn } from '../actions'

export interface LoanItemDetail {
  id: string
  borrowedQty: number
  returnedQty: number
  brokenQty: number
  missingQty: number
  item: {
    id: string
    code: string
    name: string
  }
}

export interface ReturnModalProps {
  loan: {
    id: string
    code: string
    borrowerName: string
    items: LoanItemDetail[]
  }
  onClose: () => void
}

export function ReturnModal({ loan, onClose }: ReturnModalProps) {
  const router = useRouter()
  const [officerIn, setOfficerIn] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track return inputs per loan item
  const [returnItems, setReturnItems] = useState(
    loan.items.map((li) => {
      const remaining =
        li.borrowedQty - (li.returnedQty + li.brokenQty + li.missingQty)
      return {
        loanItemId: li.id,
        name: li.item.name,
        code: li.item.code,
        remaining,
        returnedGoodQty: remaining > 0 ? remaining : 0,
        returnedBrokenQty: 0,
        missingQty: 0,
      }
    }),
  )

  function updateQty(
    loanItemId: string,
    field: 'returnedGoodQty' | 'returnedBrokenQty' | 'missingQty',
    value: number,
  ) {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.loanItemId !== loanItemId) return item
        return {
          ...item,
          [field]: Math.max(0, value),
        }
      }),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validasi kuantitas
    for (const item of returnItems) {
      const total =
        item.returnedGoodQty + item.returnedBrokenQty + item.missingQty
      if (total > item.remaining) {
        setLoading(false)
        setError(
          `Total pengembalian (${total}) melebihi sisa pinjaman (${item.remaining}) untuk ${item.name}`,
        )
        return
      }
    }

    const payload = {
      loanId: loan.id,
      officerIn: officerIn.trim(),
      notes: notes.trim() || null,
      items: returnItems.map((i) => ({
        loanItemId: i.loanItemId,
        returnedGoodQty: i.returnedGoodQty,
        returnedBrokenQty: i.returnedBrokenQty,
        missingQty: i.missingQty,
      })),
    }

    const res = await recordReturn(payload)
    setLoading(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Catat Pengembalian Barang
            </h2>
            <p className="text-xs text-neutral-500">
              No: <strong className="font-mono">{loan.code}</strong> — Peminjam:{' '}
              {loan.borrowerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
              Daftar Barang & Kuantitas Kembali
            </label>
            <div className="space-y-3">
              {returnItems.map((item) => (
                <div
                  key={item.loanItemId}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-neutral-900">
                      [{item.code}] {item.name}
                    </span>
                    <span className="rounded bg-neutral-200 px-2 py-0.5 font-medium text-neutral-700">
                      Sisa Belum Kembali: {item.remaining}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-emerald-800 font-medium">
                        Kondisi Baik
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        value={item.returnedGoodQty}
                        onChange={(e) =>
                          updateQty(
                            item.loanItemId,
                            'returnedGoodQty',
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1 text-center font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-rose-800 font-medium">
                        Kondisi Rusak
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        value={item.returnedBrokenQty}
                        onChange={(e) =>
                          updateQty(
                            item.loanItemId,
                            'returnedBrokenQty',
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1 text-center font-semibold text-rose-700"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-600 font-medium">
                        Hilang / Tertahan
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        value={item.missingQty}
                        onChange={(e) =>
                          updateQty(
                            item.loanItemId,
                            'missingQty',
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="mt-0.5 w-full rounded border border-neutral-300 px-2 py-1 text-center font-medium text-neutral-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Petugas PIC Penerima <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pak Marbot / H. Ahmad"
              value={officerIn}
              onChange={(e) => setOfficerIn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">
              Catatan Kondisi / Pengembalian
            </label>
            <textarea
              rows={2}
              placeholder="Catatan kondisi fisik, bagian patah, atau rencana susulan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Konfirmasi Pengembalian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

