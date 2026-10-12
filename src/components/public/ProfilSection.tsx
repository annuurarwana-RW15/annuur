import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { SectionHeading } from './SectionHeading'

export const PROFIL_FALLBACK = 'Profil masjid akan segera tersedia.'

export function profilText(section: Section): string {
  return asText(readField(section.content, 'profil', 'text'))
}

/** Body profil: paragraf (dipisah baris kosong) dengan tipografi shared. */
export function ProfilProse({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div
      className={`text-lg leading-relaxed text-hijau-tua/85 ${className}`.trim()}
    >
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  )
}

export function ProfilSection({ section }: { section: Section }) {
  const text = profilText(section) || PROFIL_FALLBACK

  return (
    <section id="profil" aria-labelledby="profil-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="profil-judul">{section.title}</SectionHeading>
        <div className="max-w-3xl">
          <ProfilProse text={text} />
          <Link
            href="/profil"
            className="mt-5 inline-flex font-semibold text-emas-tua transition hover:text-hijau hover:underline"
          >
            Selengkapnya tentang masjid →
          </Link>
        </div>
      </div>
    </section>
  )
}
