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
import { PrayerSchedule } from './PrayerSchedule'
import { SectionHeading } from './SectionHeading'

function ProfilSection({ section }: { section: Section }) {
  const text = asText(readField(section.content, 'profil', 'text'))

  return (
    <section id="profil" aria-labelledby="profil-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="profil-judul">{section.title}</SectionHeading>
        <div className="max-w-3xl">
          <p className="text-lg leading-relaxed text-hijau-tua/85">
            {text || 'Profil masjid akan segera tersedia.'}
          </p>
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

function PengumumanSection({ section }: { section: Section }) {
  const text =
    asText(readField(section.content, 'pengumuman', 'text')) ||
    'Ikuti kabar kegiatan dan pengumuman terbaru dari Masjid An-Nur Arwana.'

  return (
    <section
      id="pengumuman"
      aria-labelledby="pengumuman-judul"
      className="bg-krem-tua/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="pengumuman-judul">{section.title}</SectionHeading>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-lg leading-relaxed text-hijau-tua/85">{text}</p>
          <Link
            href="/berita"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-hijau px-6 py-3 font-semibold text-krem transition hover:bg-hijau-muda"
          >
            Lihat Berita
          </Link>
        </div>
      </div>
    </section>
  )
}

const RENDERERS: Record<string, (section: Section) => ReactNode> = {
  hero: (section) => <Hero section={section} />,
  profil: (section) => <ProfilSection section={section} />,
  jadwal: (section) => <PrayerSchedule section={section} />,
  pengumuman: (section) => <PengumumanSection section={section} />,
  galeri: (section) => <GallerySection section={section} />,
  kontak: (section) => <ContactSection section={section} />,
  footer: (section) => <Footer section={section} />,
}

export function SectionRenderer({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section) => {
        const render = RENDERERS[section.key]
        if (!render) return null
        return <Fragment key={section.id}>{render(section)}</Fragment>
      })}
    </>
  )
}
