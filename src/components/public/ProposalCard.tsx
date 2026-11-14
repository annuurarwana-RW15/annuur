'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProposalStatus, Prisma } from '@prisma/client'
import { formatRupiah } from '@/lib/format'
import type { ProposalFunding } from '@/lib/proposal'
import { ProposalPdfModal } from './ProposalPdfModal'

export interface ProposalWithFunding {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  coverImage: string | null
  filePdf: string | null
  filePdfSize: string | null
  targetAmount: Prisma.Decimal | number
  collectedManual: Prisma.Decimal | number
  categoryId: string | null
  category?: { id: string; name: string; color?: string | null } | null
  programId: string | null
  program?: { id: string; title: string; slug: string } | null
  startDate: Date | string | null
  endDate: Date | string | null
  status: ProposalStatus
  isFeatured: boolean
  picName: string | null
  picPhone: string | null
  createdAt: Date | string
  updatedAt: Date | string
  funding: ProposalFunding
}

const STATUS_MAP: Record<ProposalStatus, { label: string; badgeClass: string }> = {
  DIBUKA: {
    label: 'Penggalangan Dibuka',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  TERPENUHI: {
    label: 'Target Terpenuhi',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  SELESAI: {
    label: 'Selesai Dilaksanakan',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  DRAFT: {
    label: 'Draft Internal',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
}

export function ProposalCard({
  proposal,
}: {
  proposal: ProposalWithFunding
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const stat = STATUS_MAP[proposal.status] || STATUS_MAP.DIBUKA
  const { targetAmount, collectedTotal, percentage, isFulfilled } = proposal.funding

  return (
    <>
      <article className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-emas/20 bg-white shadow-xs transition hover:shadow-md">
        {/* Cover Image or Mosque Fallback */}
        <div className="relative aspect-16/9 w-full bg-hijau-tua/90 overflow-hidden">
          {proposal.coverImage ? (
            <Image
              src={proposal.coverImage}
              alt={proposal.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-krem">
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10 text-emas"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M12 3c-4.4 0-8 3.6-8 8v9h16v-9c0-4.4-3.6-8-8-8z" />
                <path d="M12 3V1m-2 0h4" />
                <path d="M10 20v-5a2 2 0 0 1 4 0v5" />
              </svg>
              <span className="mt-1 font-display text-xs text-emas-muda font-medium tracking-wide">
                Proposal Terbuka DKM
              </span>
            </div>
          )}

          {/* Badges on Top Image */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${stat.badgeClass}`}
            >
              {stat.label}
            </span>
            {proposal.isFeatured && (
              <span className="rounded-full bg-emas/90 px-2 py-0.5 text-[10px] font-bold text-hijau-tua shadow-xs">
                ★ Prioritas
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            {proposal.category && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emas-tua">
                {proposal.category.name}
              </p>
            )}

            <h3 className="mt-1 font-display text-lg font-bold text-hijau-tua line-clamp-2">
              <Link
                href={`/proposal/${proposal.slug}`}
                className="hover:text-hijau transition"
              >
                {proposal.title}
              </Link>
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
              {proposal.summary}
            </p>

            {/* Target & Dana Terkumpul Progress */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-500">Terkumpul</span>
                  <span className="font-bold text-hijau">
                    {formatRupiah(collectedTotal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-slate-500">Target RAB</span>
                  <span className="font-semibold text-slate-800">
                    {formatRupiah(targetAmount)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isFulfilled ? 'bg-emerald-500' : 'bg-hijau'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>{percentage}% Tercapai</span>
                {proposal.funding.onlineDonationsCount > 0 && (
                  <span>{proposal.funding.onlineDonationsCount} Donatur</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              {proposal.filePdf && (
                <>
                  <a
                    href={proposal.filePdf}
                    download
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 text-rose-500"
                      aria-hidden="true"
                    >
                      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    <span>Unduh PDF {proposal.filePdfSize ? `(${proposal.filePdfSize})` : ''}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                    title="Pratinjau Dokumen"
                  >
                    Pratinjau
                  </button>
                </>
              )}
            </div>

            <Link
              href={`/proposal/${proposal.slug}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-hijau px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-hijau-tua"
            >
              <span>Detail &amp; Salurkan Infaq</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        </div>
      </article>

      {proposal.filePdf && (
        <ProposalPdfModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          pdfUrl={proposal.filePdf}
          title={proposal.title}
        />
      )}
    </>
  )
}
