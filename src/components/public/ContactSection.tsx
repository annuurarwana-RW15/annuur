import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { MapLink } from './MapEmbed'
import { SectionHeading } from './SectionHeading'

interface ContactRow {
  label: string
  value: string
  href?: string
}

export interface ContactFallbacks {
  alamat?: string
  telp?: string
}

interface ContactSectionProps {
  section: Section
  /** Nilai Setting (`site.address` / `site.phone`) bila field section kosong. */
  fallbacks?: ContactFallbacks
  /** Level judul section — `h1` bila komponen dipakai sebagai halaman standalone. */
  headingAs?: 'h1' | 'h2'
}

export function ContactSection({
  section,
  fallbacks,
  headingAs = 'h2',
}: ContactSectionProps) {
  const alamat =
    asText(readField(section.content, 'kontak', 'alamat')) ||
    asText(fallbacks?.alamat)
  const telp =
    asText(readField(section.content, 'kontak', 'telp')) ||
    asText(fallbacks?.telp)
  const email = asText(readField(section.content, 'kontak', 'email'))
  const jam = asText(readField(section.content, 'kontak', 'jam'))
  const mapQuery = asText(readField(section.content, 'kontak', 'mapQuery'))
  const petaQuery = mapQuery || alamat

  const rows: ContactRow[] = [
    { label: 'Alamat', value: alamat },
    {
      label: 'Telepon',
      value: telp,
      href: telp ? `tel:${telp.replace(/[^\d+]/g, '')}` : undefined,
    },
    { label: 'Email', value: email, href: email ? `mailto:${email}` : undefined },
    { label: 'Jam Layanan', value: jam },
  ].filter((row) => row.value)

  const cardTitleClass = 'font-display text-2xl font-bold'

  return (
    <section id="kontak" aria-labelledby="kontak-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as={headingAs} id="kontak-judul">
          {section.title || 'Kontak'}
        </SectionHeading>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8">
            {rows.length === 0 ? (
              <p className="text-hijau-tua/70">
                Informasi kontak akan segera tersedia.
              </p>
            ) : (
              <dl className="grid gap-5 sm:grid-cols-2">
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                      {row.label}
                    </dt>
                    <dd className="mt-1 leading-relaxed text-hijau-tua">
                      {row.href ? (
                        <a
                          href={row.href}
                          className="font-medium transition hover:text-hijau-muda hover:underline"
                        >
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="ornament rounded-2xl bg-hijau p-6 text-krem sm:p-8">
            {headingAs === 'h1' ? (
              <h2 className={cardTitleClass}>Lokasi Masjid</h2>
            ) : (
              <h3 className={cardTitleClass}>Lokasi Masjid</h3>
            )}
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-krem/80">
              {petaQuery
                ? 'Temukan lokasi masjid pada peta.'
                : 'Peta lokasi akan segera tersedia.'}
            </p>
            {petaQuery && (
              <MapLink
                query={petaQuery}
                className="mt-5 inline-flex items-center rounded-full bg-emas px-5 py-2.5 text-sm font-semibold text-hijau transition hover:bg-emas-muda"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
