'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { InventoryItem } from '@prisma/client'
import { formatCategoryName } from '@/lib/inventaris'
import { deleteInventoryItem } from './actions'

export interface InventarisTableProps {
  items: InventoryItem[]
}

export function InventarisTable({ items }: InventarisTableProps) {
  const router = useRouter()
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = items.filter((item) => {
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    )
  })

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus barang "${name}" dari inventaris?`)) return
    setDeletingId(id)
    setError(null)
    const res = await deleteInventoryItem(id)
    setDeletingId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toolbar Filter & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Cari kode, nama, atau lokasi barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-green-800 focus:ring-1 focus:ring-green-800 focus:outline-hidden"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="SARPRAS_UMUM">Sarpras Umum</option>
            <option value="ELEKTRONIK_AUDIO">Elektronik & Audio</option>
            <option value="IBADAH_PENGAJIAN">Ibadah & Pengajian</option>
            <option value="RUKUN_KEMATIAN">Rukun Kematian</option>
            <option value="KEBERSIHAN_DAPUR">Kebersihan & Dapur</option>
          </select>
        </div>

        <p className="text-xs text-neutral-500">
          Menampilkan {filtered.length} dari {items.length} barang
        </p>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm text-neutral-700">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
            <tr>
              <th className="px-4 py-3">Kode & Nama</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3 text-center">Status Pinjam</th>
              <th className="px-4 py-3 text-center">Tersedia</th>
              <th className="px-4 py-3 text-center">Dipinjam</th>
              <th className="px-4 py-3 text-center">Rusak</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-400">
                  Tidak ada barang yang cocok dengan pencarian
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/60 transition">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-bold text-neutral-700">
                        {item.code}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.isWaqf && (
                      <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 border border-amber-200">
                        Wakaf {item.waqfDonor ? `dari ${item.waqfDonor}` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {formatCategoryName(item.category)}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {item.location}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isBorrowable ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                        Boleh Pinjam
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200">
                        Internal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">
                    {item.availableQty}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-700">
                    {item.borrowedQty}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-rose-700">
                    {item.brokenQty}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-neutral-900">
                    {item.totalQty}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/inventaris?edit=${item.id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={deletingId === item.id}
                        className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deletingId === item.id ? '...' : 'Hapus'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

