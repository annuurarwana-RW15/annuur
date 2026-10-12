import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { ContactSection } from '@/components/public/ContactSection'

export const revalidate = 60

export const metadata: Metadata = { title: 'Kontak' }

export default async function KontakPage() {
  const section = await db.section.findFirst({
    where: { key: 'kontak', isVisible: true },
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
