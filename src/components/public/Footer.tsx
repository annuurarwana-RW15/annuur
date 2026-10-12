import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText, socialLinks } from './content'
import { PUBLIC_NAV } from './nav'

interface FooterProps {
  section: Section | null
  siteName?: string
}

export function Footer({ section, siteName = 'Masjid An-Nur Arwana' }: FooterProps) {
  const rawText = section ? asText(readField(section.content, 'footer', 'text')) : ''
  const text =
    rawText || `© ${new Date().getFullYear()} ${siteName}. Semua hak dilindungi.`
  const socials = section ? socialLinks(readField(section.content, 'footer', 'social')) : []

  return (
    <footer className="ornament border-t-4 border-emas bg-hijau-tua text-krem">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="font-display text-xl font-bold">{siteName}</p>
            <p className="mt-2 text-sm leading-relaxed text-krem/75">{text}</p>
          </div>
          {socials.length > 0 && (
            <nav aria-label="Media sosial" className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <a
                  key={`${social.url}-${social.label}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-krem/30 px-4 py-1.5 text-sm transition hover:border-emas hover:text-emas"
                >
                  {social.label}
                </a>
              ))}
            </nav>
          )}
        </div>

        <nav
          aria-label="Navigasi footer"
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-krem/15 pt-6 text-sm text-krem/75"
        >
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-emas"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
