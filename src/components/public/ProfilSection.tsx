import type { Section } from '@prisma/client'
import Image from 'next/image'
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
    <section
      id="profil"
      aria-labelledby="profil-judul"
      className="relative isolate overflow-hidden bg-krem py-14 sm:py-20"
    >
      {/* Background foto masjid yang ter-blend halus ke tema krem masjid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/profil-masjid.jpg"
          alt=""
          role="presentation"
          fill
          sizes="(max-width: 768px) 100vw, 1200px"
          className="object-cover object-[75%_center] opacity-30 md:opacity-45 md:object-right filter saturate-[1.15]"
        />

        {/* Gradasi blending horizontal: memudar dari krem di area teks ke foto di sisi kanan */}
        <div className="absolute inset-0 bg-gradient-to-r from-krem via-krem/90 via-45% to-krem/40 sm:to-transparent" />

        {/* Gradasi blending vertikal: memudar di atas dan bawah agar transisi antar section menyatu */}
        <div className="absolute inset-0 bg-gradient-to-b from-krem via-transparent to-krem" />

        {/* Ornamen islami halus DKM */}
        <div className="ornament absolute inset-0 opacity-15" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Card pelindung teks: semi-transparan dengan backdrop blur & border emas halus agar teks tetap sangat mudah dibaca */}
        <div className="relative z-10 max-w-3xl rounded-3xl border border-emas/30 bg-white/85 p-6 sm:p-10 shadow-sm backdrop-blur-xs">
          <SectionHeading id="profil-judul">{section.title}</SectionHeading>
          <div className="mt-4">
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
      </div>
    </section>
  )
}
