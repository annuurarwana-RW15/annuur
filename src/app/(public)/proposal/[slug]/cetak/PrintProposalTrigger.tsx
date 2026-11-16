'use client'

import Link from 'next/link'

interface Props {
  slug: string
  filePdf?: string | null
}

export function PrintProposalTrigger({ slug, filePdf }: Props) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">
          Dokumen Proposal &amp; Rencana Anggaran Biaya (RAB)
        </p>
        <p className="text-xs text-slate-500">
          Format standar dokumen resmi DKM Masjid An-Nuur Arwana (Siap cetak A4 / Simpan PDF).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/proposal/${slug}`}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Kembali ke Detail
        </Link>

        {filePdf && (
          <a
            href={filePdf}
            download
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition"
          >
            <span>📥 Unduh File PDF Asli</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-hijau px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-hijau-tua transition"
        >
          <span>🖨️ Cetak / Simpan PDF</span>
        </button>
      </div>
    </div>
  )
}
