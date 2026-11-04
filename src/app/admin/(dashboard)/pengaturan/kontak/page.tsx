import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { requireRole } from '@/lib/rbac'
import { readField } from '../../sections/section-content'
import { KontakForm } from './KontakForm'
import type { KontakInput } from './actions'

export const metadata: Metadata = {
  title: 'Kontak & Google Maps — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default async function KontakPengaturanPage() {
  await requireRole('ADMIN')

  const [section, fallbackAddress, fallbackPhone] = await Promise.all([
    db.section.findUnique({ where: { key: 'kontak' } }),
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
  ])

  const content = section?.content

  const initial: KontakInput = {
    alamat: asText(readField(content, 'kontak', 'alamat')) || fallbackAddress,
    telp: asText(readField(content, 'kontak', 'telp')) || fallbackPhone,
    whatsapp:
      asText(readField(content, 'kontak', 'whatsapp')) ||
      asText(readField(content, 'kontak', 'wa')),
    email: asText(readField(content, 'kontak', 'email')),
    jam: asText(readField(content, 'kontak', 'jam')),
    mapUrl:
      asText(readField(content, 'kontak', 'mapUrl')) ||
      asText(readField(content, 'kontak', 'mapLink')),
    mapQuery:
      asText(readField(content, 'kontak', 'mapQuery')) ||
      asText(readField(content, 'kontak', 'mapEmbed')),
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          Kontak &amp; Google Maps
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola informasi alamat, kontak WhatsApp/telepon, email, jam layanan, serta tautan dan sematan peta Google Maps masjid.
        </p>
      </div>

      <KontakForm initial={initial} />
    </div>
  )
}

