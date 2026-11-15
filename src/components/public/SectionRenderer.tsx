import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { ContactSection } from './ContactSection'
import { Footer } from './Footer'
import { GallerySection } from './GallerySection'
import { Hero } from './Hero'
import { JumatSection } from './JumatSection'
import { PrayerSchedule } from './PrayerSchedule'
import { ProfilSection } from './ProfilSection'
import { TestimoniSection } from './TestimoniSection'
import { TikTokSection } from './TikTokSection'

import type { ArticleCardData } from './ArticleCard'

import { PengumumanSectionTabs } from './PengumumanSectionTabs'
import { getKegiatanRutinList } from '@/lib/kegiatan-rutin-server'

async function PengumumanSection({
  section,
  articles = [],
}: {
  section: Section
  articles?: ArticleCardData[]
}) {
  const text =
    asText(readField(section.content, 'pengumuman', 'text')) ||
    'Ikuti kajian keislaman, tadabbur ayat Al-Qur\'an, hadits shahih, dan agenda kegiatan rutin Masjid An-nuur Arwana.'

  const kegiatanRutinList = await getKegiatanRutinList()

  return (
    <section
      id="pengumuman"
      aria-labelledby="pengumuman-judul"
      className="bg-krem-tua/60"
    >
      <PengumumanSectionTabs
        sectionTitle={section.title}
        sectionText={text}
        articles={articles}
        kegiatanRutinList={kegiatanRutinList}
      />
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
