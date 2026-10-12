import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { jsonLd, orgLd } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { Footer } from '@/components/public/Footer'
import { PUBLIC_NAV } from '@/components/public/nav'
import { Tracker } from '@/components/public/Tracker'

export const revalidate = 60

export const metadata: Metadata = {
  title: { default: 'Masjid An-Nur Arwana', template: '%s — Masjid An-Nur Arwana' },
  description: 'Website resmi Masjid An-Nur Arwana',
}

function DomeMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6">
      <circle cx="16" cy="4.5" r="1.6" fill="currentColor" />
      <path
        d="M7.5 21c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5z"
        fill="currentColor"
      />
      <rect x="4.5" y="21" width="23" height="2.6" rx="1.3" fill="currentColor" />
      <path
        d="M13.6 23.6v-1.4a2.4 2.4 0 0 1 4.8 0v1.4z"
        fill="#0F4C3A"
        opacity="0.55"
      />
      <rect x="2" y="15" width="2" height="8.6" rx="1" fill="currentColor" />
      <rect x="28" y="15" width="2" height="8.6" rx="1" fill="currentColor" />
      <circle cx="3" cy="13.6" r="1.3" fill="currentColor" />
      <circle cx="29" cy="13.6" r="1.3" fill="currentColor" />
    </svg>
  )
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [siteName, address, phone, footer] = await Promise.all([
    getSetting('site.name', 'Masjid An-Nur Arwana'),
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
    db.section.findUnique({ where: { key: 'footer' } }),
  ])
  const name = asText(siteName, 'Masjid An-Nur Arwana')
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

      <header className="sticky top-0 z-40 border-b border-emas/40 bg-hijau text-krem shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 transition hover:text-emas-muda"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emas text-hijau">
              <DomeMark />
            </span>
            <span className="font-display text-lg font-bold leading-tight">
              {name}
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-krem/85 transition hover:bg-krem/10 hover:text-krem"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="konten" className="flex-1">
        {children}
      </main>

      {(!footer || footer.isVisible) && <Footer section={footer} siteName={name} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(org) }}
      />
      <Tracker />
    </div>
  )
}
