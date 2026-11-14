import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getProposalBySlug, calculateProposalFunding } from '@/lib/proposal'
import { formatRupiah } from '@/lib/format'
import { formatWhatsAppLink } from '@/lib/whatsapp'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const proposal = await getProposalBySlug(slug)
  if (!proposal || proposal.status === 'DRAFT') {
    return { title: 'Proposal Tidak Ditemukan' }
  }

  return {
    title: `${proposal.title} — Proposal Terbuka`,
    description: proposal.summary,
    openGraph: {
      title: proposal.title,
      description: proposal.summary,
      images: proposal.coverImage ? [proposal.coverImage] : [],
    },
  }
}

export default async function ProposalDetailPage({ params }: Props) {
  const { slug } = await params
  const proposal = await getProposalBySlug(slug)

  if (!proposal || proposal.status === 'DRAFT') {
    notFound()
  }

  const funding = await calculateProposalFunding(proposal)

  const donasiHref = proposal.categoryId
    ? `/donasi?kategori=${encodeURIComponent(proposal.categoryId)}`
    : '/donasi'

  return (
    <article className="min-h-screen bg-krem py-10 md:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs text-slate-500"
        >
          <Link href="/" className="hover:text-hijau transition">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/proposal" className="hover:text-hijau transition">
            Proposal Terbuka
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] sm:max-w-xs text-slate-700 font-medium">
            {proposal.title}
          </span>
        </nav>

        {/* Top Header Card */}
        <div className="overflow-hidden rounded-3xl border border-emas/20 bg-white shadow-sm">
          {proposal.coverImage && (
            <div className="relative aspect-21/9 w-full bg-hijau-tua">
              <Image
                src={proposal.coverImage}
                alt={proposal.title}
                fill
                priority
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {proposal.category && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  {proposal.category.name}
                </span>
              )}
              {proposal.program && (
                <Link
                  href="/program"
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100 transition"
                >
                  Program: {proposal.program.title}
                </Link>
              )}
              <span className="rounded-full bg-emas/15 px-3 py-1 text-xs font-bold text-hijau-tua">
                Status: {proposal.status}
              </span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold text-hijau-tua sm:text-3xl lg:text-4xl">
              {proposal.title}
            </h1>

            <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
              {proposal.summary}
            </p>
          </div>
        </div>

        {/* Two-Column Details & Funding Action */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Description (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-emas/20 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-display text-xl font-bold text-hijau-tua">
                Latar Belakang &amp; Rencana Pelaksanaan
              </h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-base">
                {proposal.description}
              </div>
            </div>

            {/* Official PDF Document Card */}
            {proposal.filePdf && (
              <div className="rounded-2xl border border-emas/20 bg-white p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-hijau-tua sm:text-lg">
                      Dokumen Resmi Proposal (PDF)
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Silakan unduh dokumen proposal lengkap yang memuat rincian spesifikasi teknis dan Rencana Anggaran Biaya (RAB) bertanda tangan DKM.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-rose-50 p-3 text-rose-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={proposal.filePdf}
                    download
                    className="inline-flex items-center gap-2 rounded-xl bg-hijau px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-hijau-tua transition"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    <span>Unduh Berkas Proposal {proposal.filePdfSize ? `(${proposal.filePdfSize})` : ''}</span>
                  </a>

                  <a
                    href={proposal.filePdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Buka di Tab Baru
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Action & Funding (1 col) */}
          <div className="space-y-6">
            {/* Funding Progress Box */}
            <div className="rounded-2xl border border-emas/20 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-hijau-tua">
                Pencapaian Penggalangan
              </h3>

              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs text-slate-500">Target RAB:</span>
                  <p className="text-xl font-bold text-slate-800">
                    {formatRupiah(funding.targetAmount)}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Terkumpul:</span>
                  <p className="text-xl font-bold text-hijau">
                    {formatRupiah(funding.collectedTotal)}
                  </p>
                </div>

                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={funding.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      funding.isFulfilled ? 'bg-emerald-500' : 'bg-hijau'
                    }`}
                    style={{ width: `${funding.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{funding.percentage}% Terpenuhi</span>
                  <span>Sisa: {formatRupiah(funding.remaining)}</span>
                </div>
              </div>

              {/* Action Button: Salurkan Donasi */}
              <div className="mt-6">
                <Link
                  href={donasiHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-hijau px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-hijau-tua transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-emas"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  <span>Salurkan Donasi Sekarang</span>
                </Link>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Donasi langsung tercatat dan masuk ke pos rekening masjid
                </p>
              </div>
            </div>

            {/* PIC Information */}
            {proposal.picName && (
              <div className="rounded-2xl border border-emas/20 bg-white p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Penanggung Jawab (PIC)
                </h4>
                <p className="mt-2 font-display text-base font-bold text-slate-800">
                  {proposal.picName}
                </p>
                {proposal.picPhone && (
                  <div className="mt-3">
                    <a
                      href={formatWhatsAppLink(
                        proposal.picPhone,
                        `Assalamu'alaikum, saya ingin bertanya perihal proposal: ${proposal.title}`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 transition"
                    >
                      <span>Hubungi via WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

