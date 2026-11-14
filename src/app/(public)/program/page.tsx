import type { Metadata } from 'next'
import { getAllPrograms, serializeProgram } from '@/lib/program'
import { ensureProgramAndProposalTables } from '@/lib/program-proposal-init'
import { SectionHeading } from '@/components/public/SectionHeading'
import { ProgramListClient } from '@/components/public/ProgramListClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Program Kerja DKM',
  description:
    'Rencana kerja strategis jangka pendek dan jangka panjang DKM Masjid An-Nuur Arwana beserta persentase capaian progress pelaksanaan.',
}

export default async function ProgramPage() {
  await ensureProgramAndProposalTables()
  let programs: Awaited<ReturnType<typeof getAllPrograms>> = []
  try {
    programs = await getAllPrograms()
  } catch (err) {
    console.error('[ProgramPage] Gagal memuat daftar program:', err)
  }

  const serialized = programs.map(serializeProgram)

  return (
    <section className="bg-krem min-h-screen py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="mb-8">
          <SectionHeading as="h1">Program Kerja DKM</SectionHeading>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Transparansi rencana aksi, pengembangan dakwah, sarana ibadah, dan
            pelayanan keumatan Masjid An-Nuur Arwana. Pantau progres capaian nyata
            amanah kepengurusan secara terbuka.
          </p>
        </div>

        {/* Client Listing & Filtering */}
        <ProgramListClient initialPrograms={serialized} />
      </div>
    </section>
  )
}
