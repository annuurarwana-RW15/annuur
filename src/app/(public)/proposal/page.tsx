import type { Metadata } from 'next'
import { getAllProposals, calculateProposalFunding } from '@/lib/proposal'
import { SectionHeading } from '@/components/public/SectionHeading'
import { ProposalCard, type ProposalWithFunding } from '@/components/public/ProposalCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Proposal Terbuka & Peluang Amal Jariyah',
  description:
    'Daftar proposal terbuka program pembangunan fisik, sarana ibadah, dan pengadaan fasilitas Masjid An-Nuur Arwana dengan target RAB transparan.',
}

export default async function ProposalListingPage() {
  const all = await getAllProposals()
  // Filter out internal drafts from public listing
  const publicProposals = all.filter((p) => p.status !== 'DRAFT')

  const proposalsWithFunding: ProposalWithFunding[] = await Promise.all(
    publicProposals.map(async (p) => {
      const funding = await calculateProposalFunding(p)
      return {
        ...p,
        funding,
      } as ProposalWithFunding
    }),
  )

  return (
    <section className="bg-krem min-h-screen py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <SectionHeading as="h1">Proposal Terbuka</SectionHeading>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Ambil bagian dalam amal jariyah berkelanjutan melalui program-program
            pengembangan masjid yang membutuhkan partisipasi jamaah. Unduh
            dokumen resmi Rencana Anggaran Biaya (RAB) dan salurkan donasi secara
            akuntabel.
          </p>
        </div>

        {/* List of Proposals */}
        {proposalsWithFunding.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="font-semibold text-slate-700">
              Belum ada proposal terbuka yang sedang berjalan.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Silakan periksa kembali di lain waktu untuk program kebaikan berikutnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proposalsWithFunding.map((prop) => (
              <ProposalCard key={prop.id} proposal={prop} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
