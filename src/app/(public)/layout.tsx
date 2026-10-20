import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { buildPublicMetadata, jsonLd, orgLd } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { Footer } from '@/components/public/Footer'
import { PublicHeader } from '@/components/public/PublicHeader'
import { Tracker } from '@/components/public/Tracker'

export const revalidate = 60

// Judul & deskripsi berasal dari Setting (grup "SEO Global" di admin),
// bukan konstanta — `revalidatePath('/', 'layout')` menyegarkannya saat disimpan.
export async function generateMetadata(): Promise<Metadata> {
  const [seoTitle, seoDescription, siteName] = await Promise.all([
    getSetting('seo.title', ''),
    getSetting('seo.description', ''),
    getSetting('site.name', ''),
  ])
  return buildPublicMetadata({ seoTitle, seoDescription, siteName })
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [siteName, address, phone, footer, ga4Raw] = await Promise.all([
    getSetting('site.name', 'Masjid An-nuur Arwana'),
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
    db.section.findUnique({ where: { key: 'footer' } }),
    getSetting('ga4.id', ''),
  ])
  const name = asText(siteName, 'Masjid An-nuur Arwana')
  const ga4Id = typeof ga4Raw === 'string' && /^G-[A-Z0-9]{4,}$/i.test(ga4Raw.trim())
    ? ga4Raw.trim()
    : ''
  const org = orgLd({
    name,
    address: asText(address),
    phone: asText(phone),
  })

  return (
    <div className="flex min-h-screen flex-col bg-krem text-hijau-tua">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-emas focus:px-5 focus:py-2 focus:font-semibold focus:text-hijau"
      >
        Lewati ke konten
      </a>

      <PublicHeader siteName={name} />

      <main id="konten" className="flex-1">
        {children}
      </main>

      {(!footer || footer.isVisible) && <Footer section={footer} siteName={name} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(org) }}
      />
      <Tracker />

      {ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments)}; gtag('js', new Date()); gtag('config', '${ga4Id}');`,
            }}
          />
        </>
      )}
    </div>
  )
}
