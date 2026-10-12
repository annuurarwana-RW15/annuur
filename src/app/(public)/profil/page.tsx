import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { asText } from '@/components/public/content'
import {
  PROFIL_FALLBACK,
  ProfilProse,
  profilText,
} from '@/components/public/ProfilSection'
import { SectionHeading } from '@/components/public/SectionHeading'

export const revalidate = 60

export const metadata: Metadata = { title: 'Profil' }

export default async function ProfilPage() {
  const section = await db.section.findFirst({
    where: { key: 'profil', isVisible: true },
  })
  if (!section) notFound()

  const [address, phone, city] = await Promise.all([
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
    getSetting('site.city', ''),
  ])

  const tel = asText(phone)
  const facts = [
    { label: 'Alamat', value: asText(address), href: '' },
    {
      label: 'Telepon',
      value: tel,
      href: tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : '',
    },
    { label: 'Kota', value: asText(city), href: '' },
  ].filter((fact) => fact.value)

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">{section.title || 'Profil'}</SectionHeading>

        <ProfilProse
          text={profilText(section) || PROFIL_FALLBACK}
          className="mt-6 max-w-3xl"
        />

        {facts.length > 0 && (
          <div className="ornament mt-10 rounded-2xl bg-hijau p-6 text-krem sm:p-8">
            <h2 className="font-display text-2xl font-bold">Informasi Masjid</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-emas">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 leading-relaxed text-krem/90">
                    {fact.href ? (
                      <a
                        href={fact.href}
                        className="font-medium transition hover:text-emas-muda hover:underline"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
