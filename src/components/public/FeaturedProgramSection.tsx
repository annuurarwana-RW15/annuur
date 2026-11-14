import Link from 'next/link'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { SectionHeading } from './SectionHeading'
import { ProgramCard, type ProgramWithRelations } from './ProgramCard'

interface FeaturedProgramSectionProps {
  programs: ProgramWithRelations[]
  section?: Section | null
}

export function FeaturedProgramSection({ programs, section }: FeaturedProgramSectionProps) {
  if (section && !section.isVisible) return null
  if (!programs || programs.length === 0) return null

  const title = section?.title || 'Program Kerja Strategis'
  const subjudul =
    asText(readField(section?.content, 'program', 'subjudul')) || 'Amanah & Khidmah'
  const text =
    asText(readField(section?.content, 'program', 'text')) ||
    'Ikhtiar nyata DKM Masjid An-Nuur Arwana dalam memakmurkan masjid, memelihara sarana ibadah, dan melayani kebutuhan keumatan.'

  return (
    <section className="border-b border-emas/15 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emas-tua">
              {subjudul}
            </span>
            <SectionHeading as="h2">{title}</SectionHeading>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              {text}
            </p>
          </div>

          <Link
            href="/program"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emas/30 bg-krem-muda/30 px-4 py-2 text-xs font-bold text-hijau-tua shadow-2xs hover:bg-hijau hover:text-white transition"
          >
            <span>Lihat Semua Program Kerja</span>
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
          {programs.map((prog) => (
            <ProgramCard key={prog.id} program={prog} />
          ))}
        </div>
      </div>
    </section>
  )
}

