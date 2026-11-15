import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { ContactSection } from './ContactSection'
import { DonationSection, type RekeningDisplayItem } from './DonationSection'
import { FeaturedProgramSection } from './FeaturedProgramSection'
import { FeaturedProposalSection } from './FeaturedProposalSection'
import { FinanceSummary } from './FinanceSummary'
import { Footer } from './Footer'
import { GallerySection } from './GallerySection'
import { Hero } from './Hero'
import { JumatSection } from './JumatSection'
import { PrayerSchedule } from './PrayerSchedule'
import { ProfilSection } from './ProfilSection'
import { QuranMurottalSection } from './QuranMurottalSection'
import { TestimoniSection } from './TestimoniSection'
import { TikTokSection } from './TikTokSection'
import type { ArticleCardData } from './ArticleCard'
import type { DailyMonthSeries } from '@/lib/kas-daily'
import { DEFAULT_QRIS, type QrisInfo } from '@/lib/qris'
import type { SurahMeta } from '@/lib/quran'
import type { ProposalWithFunding } from './ProposalCard'
import type { ProgramWithRelations } from './ProgramCard'
import { PengumumanSectionTabs } from './PengumumanSectionTabs'
import { getKegiatanRutinList } from '@/lib/kegiatan-rutin-server'

export interface SectionRendererContext {
  articles?: ArticleCardData[]
  whatsapp?: string
  saldo?: number | null
  daily?: DailyMonthSeries
  qris?: QrisInfo | null
  rekening?: readonly RekeningDisplayItem[]
  surahs?: SurahMeta[]
  proposals?: ProposalWithFunding[]
  programs?: ProgramWithRelations[]
}

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
  (section: Section, ctx: SectionRendererContext) => ReactNode
> = {
  hero: (section, ctx) => <Hero section={section} whatsapp={ctx.whatsapp} />,
  profil: (section) => <ProfilSection section={section} />,
  jadwal: (section) => <PrayerSchedule section={section} />,
  jumat: (section) => <JumatSection section={section} />,
  keuangan: (section, ctx) => (
    <FinanceSummary
      saldo={ctx.saldo ?? null}
      daily={ctx.daily ?? { bulan: '', points: [] }}
      qris={ctx.qris || DEFAULT_QRIS}
      section={section}
    />
  ),
  quran: (section, ctx) => (
    <QuranMurottalSection surahs={ctx.surahs ?? []} section={section} />
  ),
  proposal: (section, ctx) => (
    <FeaturedProposalSection proposals={ctx.proposals ?? []} section={section} />
  ),
  program: (section, ctx) => (
    <FeaturedProgramSection programs={ctx.programs ?? []} section={section} />
  ),
  donasi: (section, ctx) => (
    <DonationSection
      qris={ctx.qris || DEFAULT_QRIS}
      rekening={ctx.rekening ?? []}
      whatsapp={ctx.whatsapp}
      section={section}
    />
  ),
  pengumuman: (section, ctx) => (
    <PengumumanSection section={section} articles={ctx.articles} />
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
  context,
}: {
  sections: Section[]
  articles?: ArticleCardData[]
  whatsapp?: string
  context?: SectionRendererContext
}) {
  const mergedContext: SectionRendererContext = {
    articles,
    whatsapp,
    ...context,
  }

  return (
    <>
      {sections.map((section) => {
        const render = RENDERERS[section.key]
        if (!render) return null
        return <Fragment key={section.id}>{render(section, mergedContext)}</Fragment>
      })}
    </>
  )
}
