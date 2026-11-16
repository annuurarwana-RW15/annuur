import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { isRichHtml } from '@/lib/article-html'
import { sanitizeArticleHtml } from '@/lib/sanitize-content'
import { splitReadmore } from '@/lib/readmore'
import { asText } from './content'
import { SectionHeading } from './SectionHeading'

export const PROFIL_FALLBACK = 'Profil masjid akan segera tersedia.'

export function profilText(section: Section): string {
  return asText(readField(section.content, 'profil', 'text'))
}

/** Body profil: mendukung HTML kaya tersanitasi maupun teks paragraf polos. */
export function ProfilProse({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  if (isRichHtml(text)) {
    return (
      <div
        className={`article-body text-base sm:text-lg leading-relaxed text-hijau-tua/90 ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(text) }}
      />
    )
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div
      className={`space-y-4 text-base sm:text-lg leading-relaxed text-hijau-tua/85 ${className}`.trim()}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  )
}

export function ProfilSection({ section }: { section: Section }) {
  const fullText = profilText(section) || PROFIL_FALLBACK
  const { preview } = splitReadmore(fullText)

  return (
    <section id="profil" aria-labelledby="profil-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="profil-judul">{section.title}</SectionHeading>
        <div className="max-w-3xl">
          <ProfilProse text={preview} />
          <Link
            href="/profil"
            className="mt-6 inline-flex items-center gap-1.5 font-semibold text-emas-tua transition hover:text-hijau hover:underline"
          >
            <span>Selengkapnya tentang masjid</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
