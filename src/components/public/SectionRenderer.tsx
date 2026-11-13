import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { ContactSection } from './ContactSection'
import { Footer } from './Footer'
import { GallerySection } from './GallerySection'
import { Hero } from './Hero'
import { JumatSection } from './JumatSection'
import { PrayerSchedule } from './PrayerSchedule'
import { ProfilSection } from './ProfilSection'
import { SectionHeading } from './SectionHeading'
import { TestimoniSection } from './TestimoniSection'
import { TikTokSection } from './TikTokSection'

import { ArticleCard, type ArticleCardData } from './ArticleCard'

function PengumumanSection({
  section,
  articles = [],
}: {
  section: Section
  articles?: ArticleCardData[]
}) {
  const text =
    asText(readField(section.content, 'pengumuman', 'text')) ||
    'Ikuti kajian keislaman, tadabbur ayat Al-Qur\'an, hadits shahih, dan agenda kegiatan Masjid An-nuur Arwana.'

  return (
    <section
      id="pengumuman"
      aria-labelledby="pengumuman-judul"
      className="bg-krem-tua/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <SectionHeading id="pengumuman-judul">{section.title}</SectionHeading>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-hijau-tua/80">
              {text}
            </p>
          </div>
          <Link
            href="/berita"
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emas/40 bg-white px-5 py-2.5 text-sm font-semibold text-hijau shadow-xs transition hover:bg-emas hover:text-hijau-tua"
          >
            <span>Lihat Semua Berita &amp; Artikel</span>
            <span>→</span>
          </Link>
        </div>

        {articles.length === 0 ? (
          <p className="mt-8 text-hijau-tua/70">Belum ada artikel atau pengumuman</p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug} className="h-full">
                <ArticleCard article={article} showCategory />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/berita"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emas/40 bg-white px-6 py-2.5 text-sm font-semibold text-hijau shadow-xs transition hover:bg-emas hover:text-hijau-tua"
          >
            <span>Lihat Semua Berita &amp; Artikel</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

const RENDERERS: Record<
  string,
  (section: Section, articles?: ArticleCardData[], whatsapp?: string) => ReactNode
> = {
  hero: (section, _articles, whatsapp) => <Hero section={section} whatsapp={whatsapp} />,
  profil: (section) => <ProfilSection section={section} />,
  jadwal: (section) => <PrayerSchedule section={section} />,
  jumat: (section) => <JumatSection section={section} />,
  pengumuman: (section, articles) => (
    <PengumumanSection section={section} articles={articles} />
  ),
  galeri: (section) => <GallerySection section={section} />,
  testimoni: (section) => <TestimoniSection section={section} />,
  kontak: (section) => <ContactSection section={section} />,
  footer: (section) => <Footer section={section} />,
  tiktok: (section) => <TikTokSection section={section} />,
}

export function SectionRenderer({
  sections,
  articles,
  whatsapp,
}: {
  sections: Section[]
  articles?: ArticleCardData[]
  whatsapp?: string
}) {
  return (
    <>
      {sections.map((section) => {
        const render = RENDERERS[section.key]
        if (!render) return null
        return <Fragment key={section.id}>{render(section, articles, whatsapp)}</Fragment>
      })}
    </>
  )
}
