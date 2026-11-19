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
      className="relative overflow-hidden bg-krem py-12 sm:py-20 lg:py-24"
    >
      {/* Background foto masjid yang ter-blend ke latar belakang */}
      <div
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/profil-masjid.jpg"
          alt="Masjid An-Nuur Arwana"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[75%_center] sm:object-[80%_center] lg:object-right opacity-85 sm:opacity-95"
        />

        {/* Gradasi blending horizontal: di sisi teks (kiri) menyatu dengan warna krem dasar, di sisi kanan foto masjid tetap jelas dan hidup */}
        <div className="absolute inset-0 bg-gradient-to-r from-krem via-krem/90 via-35% to-krem/30 lg:to-transparent" />

        {/* Gradasi blending vertikal: transisi halus di atas dan bawah agar menyatu antar-section */}
        <div className="absolute inset-0 bg-gradient-to-b from-krem via-transparent via-50% to-krem" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Sisi Teks: Card elegan semi-transparan dengan backdrop blur & border emas halus agar teks ultra-readable */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="rounded-3xl border border-emas/30 bg-white/92 p-6 sm:p-10 shadow-lg backdrop-blur-md">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emas/40 bg-krem px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                <span>🕌</span> Tentang Masjid Kami
              </span>
              <SectionHeading id="profil-judul" className="mt-3">
                {section.title}
              </SectionHeading>
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

          {/* Sisi Kanan: Ruang terbuka yang menampilkan foto masjid di background dengan badge info */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4" aria-hidden="true">
            <div className="ml-auto max-w-xs rounded-2xl border border-white/60 bg-white/70 p-4 text-xs font-medium text-hijau-tua shadow-md backdrop-blur-md">
              <p className="font-bold text-sm text-hijau">Masjid An-Nuur Arwana</p>
              <p className="text-hijau-tua/80 mt-1">Pusat Ibadah, Pembinaan Jamaah &amp; Kemakmuran Umat</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
