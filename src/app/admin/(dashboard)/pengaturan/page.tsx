import type { Metadata } from 'next'
import { getSetting } from '@/lib/settings'
import { parseQris } from '@/lib/qris'
import { requireRole } from '@/lib/rbac'
import { PengaturanForm } from './PengaturanForm'
import type { PengaturanInput } from './actions'

export const metadata: Metadata = {
  title: 'Pengaturan — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function rekeningList(value: unknown): PengaturanInput['donasi']['rekening'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const rec = raw as Record<string, unknown>
    const bank = asText(rec.bank)
    const no = asText(rec.no)
    const atasNama = asText(rec.atasNama) || asText(rec['a.n.'])
    const link = asText(rec.link)
    if (!bank || !no) return []
    return [{ bank, no, atasNama, ...(link ? { link } : {}) }]
  })
}

export default async function PengaturanPage() {
  await requireRole('ADMIN')

  const [
    siteName,
    siteAddress,
    sitePhone,
    siteCity,
    seoTitle,
    seoDescription,
    rekeningRaw,
    qrisRaw,
    ga4Id,
  ] = await Promise.all([
    getSetting('site.name', 'Masjid An-nuur Arwana'),
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
    getSetting('site.city', ''),
    getSetting('seo.title', ''),
    getSetting('seo.description', ''),
    getSetting<unknown>('donasi.rekening', []),
    getSetting<unknown>('donasi.qris', null),
    getSetting('ga4.id', ''),
  ])

  const initial: PengaturanInput = {
    site: {
      name: siteName,
      address: siteAddress,
      phone: sitePhone,
      city: siteCity,
    },
    seo: { title: seoTitle, description: seoDescription },
    donasi: {
      rekening: rekeningList(rekeningRaw),
      qris: parseQris(qrisRaw) ?? { image: '', caption: '' },
    },
    ga4: { id: ga4Id },
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Pengaturan</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Identitas, lokasi &amp; jadwal sholat, rekening &amp; QRIS donasi, SEO,
        dan analitik.
      </p>
      <div className="mt-6">
        <PengaturanForm initial={initial} />
      </div>
    </div>
  )
}
