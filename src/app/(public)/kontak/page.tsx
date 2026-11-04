import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { ensureDefaultSections } from '@/lib/sections-init'
import { ContactSection } from '@/components/public/ContactSection'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Kontak & Lokasi — Masjid An-nuur Arwana',
  description: 'Informasi kontak sekretariat DKM, alamat lengkap, nomor telepon, WhatsApp, dan peta Google Maps Masjid An-nuur Arwana.',
}

export default async function KontakPage() {
  await ensureDefaultSections()

  const section = await db.section.findFirst({
    where: { key: 'kontak' },
  })
  if (!section) notFound()

  const [address, phone] = await Promise.all([
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
  ])

  return (
    <ContactSection
      section={section}
      headingAs="h1"
      fallbacks={{ alamat: address, telp: phone }}
    />
  )
}
