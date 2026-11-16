import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProposalBySlug, calculateProposalFunding } from '@/lib/proposal'
import { getSetting } from '@/lib/settings'
import { formatDateID, formatRupiah } from '@/lib/format'
import { PrintProposalTrigger } from './PrintProposalTrigger'

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
    title: `Cetak Dokumen Proposal — ${proposal.title}`,
    robots: { index: false, follow: false },
  }
}

export default async function CetakProposalPage({ params }: Props) {
  const { slug } = await params
  const [proposal, siteName, siteAddress, sitePhone] = await Promise.all([
    getProposalBySlug(slug),
    getSetting('site.name', 'Masjid An-Nuur Arwana'),
    getSetting('site.address', 'Jl. Arwana No. 15, Karawang'),
    getSetting('site.phone', '0812-3456-7890'),
  ])

  if (!proposal || proposal.status === 'DRAFT') {
    notFound()
  }

  const funding = await calculateProposalFunding(proposal)

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <PrintProposalTrigger slug={proposal.slug} filePdf={proposal.filePdf} />

        {/* Lembar Dokumen Cetak / Unduh Resmi A4 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-slate-900 shadow-sm print:border-none print:p-0 print:shadow-none">
          {/* KOP Surat DKM */}
          <div className="border-b-2 border-slate-900 pb-5 text-center">
            <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-emerald-950">
              DEWAN KEMAKMURAN MASJID (DKM)
            </h1>
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wide text-emerald-900 mt-0.5">
              {String(siteName)}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {String(siteAddress)} {sitePhone ? `· Telp/WA: ${sitePhone}` : ''}
            </p>
            <div className="mt-4 inline-block rounded-full bg-emerald-50 border border-emerald-300 px-4 py-1 text-xs font-bold uppercase tracking-wide text-emerald-900">
              DOKUMEN RESMI PROPOSAL &amp; RENCANA ANGGARAN BIAYA (RAB)
            </div>
          </div>

          {/* Header Metadata Dokumen */}
          <div className="mt-6 border-b border-slate-100 pb-4 text-xs text-slate-600 grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Nomor Arsip:</strong> DKM/PROP/{proposal.id.slice(-6).toUpperCase()}
              </p>
              <p className="mt-1">
                <strong>Status Penggalangan:</strong>{' '}
                <span className="font-bold text-emerald-800 uppercase">{proposal.status}</span>
              </p>
              {proposal.category && (
                <p className="mt-1">
                  <strong>Pos Kategori:</strong> {proposal.category.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p>
                <strong>Tanggal Terbit:</strong>{' '}
                {formatDateID(new Date(proposal.createdAt))}
              </p>
              <p className="mt-1">
                <strong>Penanggung Jawab (PIC):</strong>{' '}
                <span className="font-bold text-slate-800">
                  {proposal.picName || 'Pengurus DKM'}
                </span>
              </p>
              {proposal.picPhone && (
                <p className="mt-1">
                  <strong>Kontak PIC:</strong> {proposal.picPhone}
                </p>
              )}
            </div>
          </div>

          {/* Judul & Ringkasan Eksekutif */}
          <div className="mt-6">
            <h3 className="font-display text-xl font-bold text-slate-900">
              {proposal.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 italic border-l-4 border-emerald-600 pl-3 py-1 bg-emerald-50/50 rounded-r-lg">
              &ldquo;{proposal.summary}&rdquo;
            </p>
          </div>

          {/* Rincian Latar Belakang & Spesifikasi */}
          <div className="mt-6">
            <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-950 border-b border-slate-200 pb-1.5">
              I. Latar Belakang &amp; Rencana Pelaksanaan
            </h4>
            <div className="mt-3 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-800">
              {proposal.description}
            </div>
          </div>

          {/* Tabel Rencana Anggaran Biaya (RAB) */}
          <div className="mt-6">
            <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-950 border-b border-slate-200 pb-1.5">
              II. Rencana Anggaran Biaya (RAB) &amp; Rekapitulasi Donasi
            </h4>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Komponen Anggaran</th>
                    <th className="py-2.5 px-3 text-right">Nilai / Nominal</th>
                    <th className="py-2.5 px-3 text-right">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      Total Target Kebutuhan Anggaran (RAB)
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(funding.targetAmount)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">Target Penuh</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      Perolehan Donasi Manual / Tunai &amp; Material
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-700">
                      {formatRupiah(funding.collectedManual)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">Tercatat di Kasir</td>
                  </tr>
                  {funding.onlineDonationsTotal > 0 && (
                    <tr>
                      <td className="py-2 px-3 text-slate-700">
                        Perolehan Donasi Online / Transfer Digital
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-700">
                        {formatRupiah(funding.onlineDonationsTotal)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">
                        {funding.onlineDonationsCount} Transaksi
                      </td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50/70 font-semibold text-emerald-950">
                    <td className="py-2.5 px-3">Total Donasi Terkumpul Sementara</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {formatRupiah(funding.collectedTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{funding.percentage}% Tercapai</td>
                  </tr>
                  <tr className="bg-amber-50/70 font-semibold text-amber-950">
                    <td className="py-2.5 px-3">Sisa Kekurangan Anggaran Dibutuhkan</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-900">
                      {formatRupiah(funding.remaining)}
                    </td>
                    <td className="py-2.5 px-3 text-right">Peluang Infaq</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pengesahan Tanda Tangan */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <p className="text-right text-xs text-slate-600">
              Ditetapkan di Karawang, {formatDateID(new Date())}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="font-semibold text-slate-700">Penanggung Jawab (PIC)</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  {proposal.picName || '( ................................... )'}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Ketua DKM</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  ( H. Bambang Irawan )
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Bendahara DKM</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  ( Ust. Ahmad Fauzi )
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

