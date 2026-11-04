'use client'

import { useState } from 'react'
import { formatDateID, formatRupiah } from '@/lib/format'
import { AcquisitionModal, type ItemOption, type CategoryOption } from './AcquisitionModal'

export interface AcquisitionItemRow {
  id: string
  date: Date | string
  quantity: number
  source: string
  unitPrice: unknown
  donorName: string | null
  officer: string
  notes: string | null
  item: {
    id: string
    code: string
    name: string
  }
  transaction?: {
    id: string
    amount: unknown
  } | null
}

export interface AcquisitionTableProps {
  acquisitions: AcquisitionItemRow[]
  items: ItemOption[]
  cashCategories: CategoryOption[]
}

export function AcquisitionTable({
  acquisitions,
  items,
  cashCategories,
}: AcquisitionTableProps) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'PEMBELIAN_KAS' | 'WAKAF_HIBAH'>('ALL')
  const [showModal, setShowModal] = useState(false)

  const filtered = acquisitions.filter((a) => {
    const matchSearch =
      a.item.name.toLowerCase().includes(search.toLowerCase()) ||
      a.item.code.toLowerCase().includes(search.toLowerCase()) ||
      a.officer.toLowerCase().includes(search.toLowerCase()) ||
      (a.donorName && a.donorName.toLowerCase().includes(search.toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(search.toLowerCase()))

    const matchSource = sourceFilter === 'ALL' || a.source === sourceFilter

    return matchSearch && matchSource
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Cari barang, petugas, donatur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 rounded-lg border border-neutral-300 px-3 py-2 text-xs"
          />

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Sumber</option>
            <option value="PEMBELIAN_KAS">Pembelian Kas</option>
            <option value="WAKAF_HIBAH">Wakaf / Hibah</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
        >
          + Catat Pengadaan Baru
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-600">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Barang Inventaris</th>
                <th className="p-3">Sumber Perolehan</th>
                <th className="p-3 text-center">Jumlah Masuk</th>
                <th className="p-3">Biaya / Donatur</th>
                <th className="p-3">Petugas PIC</th>
                <th className="p-3">Integrasi Kas</th>
                <th className="p-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-400">
                    Belum ada riwayat pengadaan barang.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const dateStr = formatDateID(new Date(a.date))
                  const priceNum = a.unitPrice != null ? Number(a.unitPrice) : null
                  const totalCost = (priceNum ?? 0) * a.quantity

                  return (
                    <tr key={a.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 text-neutral-600 whitespace-nowrap">{dateStr}</td>
                      <td className="p-3">
                        <span className="font-semibold text-neutral-900 block">
                          {a.item.name}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {a.item.code}
                        </span>
                      </td>
                      <td className="p-3">
                        {a.source === 'PEMBELIAN_KAS' ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-800">
                            Pembelian Kas
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-800">
                            Wakaf / Hibah
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-green-950">
                        +{a.quantity} unit
                      </td>
                      <td className="p-3">
                        {a.source === 'PEMBELIAN_KAS' ? (
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {formatRupiah(totalCost)}
                            </span>
                            {priceNum != null && priceNum > 0 ? (
                              <span className="text-[10px] text-neutral-500">
                                @ {formatRupiah(priceNum)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-purple-900 block">
                              {a.donorName || 'Hamba Allah'}
                            </span>
                            <span className="text-[10px] text-neutral-400">Donatur</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-medium text-neutral-700">{a.officer}</td>
                      <td className="p-3">
                        {a.transaction ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ Kas Keluar #{a.transaction.id.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-neutral-500 max-w-xs truncate">
                        {a.notes || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AcquisitionModal
          items={items}
          cashCategories={cashCategories}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

