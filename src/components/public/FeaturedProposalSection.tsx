import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { ProposalCard, type ProposalWithFunding } from './ProposalCard'

interface FeaturedProposalSectionProps {
  proposals: ProposalWithFunding[]
}

export function FeaturedProposalSection({ proposals }: FeaturedProposalSectionProps) {
  if (!proposals || proposals.length === 0) return null

  return (
    <section className="bg-krem-muda/40 border-y border-emas/15 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emas-tua">
              Peluang Amal Jariyah
            </span>
            <SectionHeading as="h2">Proposal Terbuka Pilihan</SectionHeading>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Dukung realisasi program prioritas pembangunan dan fasilitas ibadah
              Masjid An-Nuur Arwana. Partisipasi Anda adalah investasi akhirat.
            </p>
          </div>

          <Link
            href="/proposal"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emas/30 bg-white px-4 py-2 text-xs font-bold text-hijau-tua shadow-2xs hover:bg-hijau hover:text-white transition"
          >
            <span>Lihat Semua Proposal</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((prop) => (
            <ProposalCard key={prop.id} proposal={prop} />
          ))}
        </div>
      </div>
    </section>
  )
}

