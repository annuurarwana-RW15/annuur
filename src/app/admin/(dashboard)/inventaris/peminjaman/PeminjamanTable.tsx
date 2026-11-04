'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LoanStatus } from '@prisma/client'
import { formatLoanStatus } from '@/lib/inventaris'
import { ReturnModal, type LoanItemDetail } from './ReturnModal'

export interface LoanWithDetails {
  id: string
  code: string
  borrowerName: string
  borrowerPhone: string
  borrowerAddress: string | null
  purpose: string
  loanDate: Date
  expectedReturn: Date
  actualReturn: Date | null
  status: LoanStatus
  officerOut: string
  officerIn: string | null
  notes: string | null
  items: LoanItemDetail[]
}

export function PeminjamanTable({ loans }: { loans: LoanWithDetails[] }) {
  const [tab, setTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE')
  const [selectedForReturn, setSelectedForReturn] = useState<LoanWithDetails | null>(
    null,
  )

  const activeLoans = loans.filter((l) => l.status !== 'SELESAI')
  const completedLoans = loans.filter((l) => l.status === 'SELESAI')

  const displayedLoans = tab === 'ACTIVE' ? activeLoans : completedLoans

  return (
    <div className="mt-6 space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setTab('ACTIVE')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tab === 'ACTIVE'
              ? 'border-green-900 text-green-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Sedang Dipinjam ({activeLoans.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('COMPLETED')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            tab === 'COMPLETED'
              ? 'border-green-900 text-green-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Riwayat Selesai ({completedLoans.length})
        </button>
      </div>

      {/* Tabel Pinjaman */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm text-neutral-700">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
            <tr>
              <th className="px-4 py-3">No. Pinjam & Peminjam</th>
              <th className="px-4 py-3">Keperluan</th>
              <th className="px-4 py-3">Barang & Kuantitas</th>
              <th className="px-4 py-3">Jadwal Pinjam</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {displayedLoans.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-400">
                  {tab === 'ACTIVE'
                    ? 'Tidak ada peminjaman yang sedang aktif.'
                    : 'Belum ada riwayat peminjaman selesai.'}
                </td>
              </tr>
            ) : (
              displayedLoans.map((loan) => {
                const statusMeta = formatLoanStatus(loan.status)
                const loanDateStr = new Date(loan.loanDate).toLocaleDateString(
                  'id-ID',
                  { day: 'numeric', month: 'short', year: 'numeric' },
                )
                const returnDateStr = new Date(
                  loan.expectedReturn,
                ).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })

                return (
                  <tr key={loan.id} className="hover:bg-neutral-50/60 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-neutral-800">
                        {loan.code}
                      </span>
                      <p className="font-semibold text-neutral-900">
                        {loan.borrowerName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        WA: {loan.borrowerPhone}
                        {loan.borrowerAddress ? ` · ${loan.borrowerAddress}` : ''}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-xs text-neutral-700 max-w-xs">
                      <p className="font-medium text-neutral-800">{loan.purpose}</p>
                      <p className="text-neutral-400 mt-0.5">
                        PIC Serah: {loan.officerOut}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-xs text-neutral-700">
                      <div className="space-y-1">
                        {loan.items.map((li) => {
                          const totalBack =
                            li.returnedQty + li.brokenQty + li.missingQty
                          return (
                            <div key={li.id} className="flex items-center gap-1.5">
                              <span className="font-medium">
                                {li.item.name}:
                              </span>
                              <span className="font-bold text-neutral-900">
                                {li.borrowedQty} unit
                              </span>
                              {totalBack > 0 && (
                                <span className="text-[11px] text-emerald-700 font-semibold">
                                  ({li.returnedQty} kembali
                                  {li.brokenQty > 0 ? `, ${li.brokenQty} rusak` : ''}
                                  )
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-neutral-600">
                      <p>Pinjam: {loanDateStr}</p>
                      <p className="font-medium text-neutral-900">
                        Kembali: {returnDateStr}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/inventaris/peminjaman/${loan.id}/cetak`}
                          target="_blank"
                          className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          Cetak Slip
                        </Link>
                        {loan.status !== 'SELESAI' && (
                          <button
                            type="button"
                            onClick={() => setSelectedForReturn(loan)}
                            className="rounded-lg bg-green-900 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
                          >
                            Pengembalian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedForReturn && (
        <ReturnModal
          loan={selectedForReturn}
          onClose={() => setSelectedForReturn(null)}
        />
      )}
    </div>
  )
}

