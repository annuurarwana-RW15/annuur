import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { buildMetadata } from '@/lib/seo'
import { asText, safeHref } from '@/components/public/content'
import { SectionHeading } from '@/components/public/SectionHeading'
import { DonationForm } from '@/components/public/DonationForm'

export const revalidate = 60

const DEFAULT_SITE_NAME = 'Masjid An-Nur Arwana'

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSetting('site.name', DEFAULT_SITE_NAME)

  return buildMetadata({
    title: 'Donasi & Infaq',
    description:
      'Donasi, infaq, dan sedekah untuk kelanjutan Masjid An-Nur Arwana. Transfer ke rekening resmi lalu unggah bukti transfer.',
    path: '/donasi',
    // openGraph eksplisit menimpa og:image warisan root (lihat berita/page.tsx)
    image: '/opengraph-image',
    siteName: asText(siteName, DEFAULT_SITE_NAME),
  })
}

interface RekeningItem {
  bank: string
  no: string
  atasNama: string
  link: string | null
}

/** Setting `donasi.rekening`: array `{bank, no, a.n.}` (juga menerima `atasNama`). */
function rekeningItems(value: unknown): RekeningItem[] {
  if (!Array.isArray(value)) return []

  const items: RekeningItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const bank = asText(rec.bank)
    const no = asText(rec.no)
    const atasNama =
      asText(rec.atasNama) || asText(rec['a.n.']) || asText(rec.an)
    if (!bank || !no) continue
    items.push({ bank, no, atasNama, link: safeHref(asText(rec.link)) })
  }
  return items
}

export default async function DonasiPage() {
  const [rekeningRaw, phone, categories] = await Promise.all([
    getSetting<unknown>('donasi.rekening', []),
    getSetting('site.phone', ''),
    db.category.findMany({
      where: { type: 'MASUK', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const rekening = rekeningItems(rekeningRaw)
  const telp = asText(phone)

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">Donasi &amp; Infaq</SectionHeading>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-hijau-tua/80 sm:text-base">
          Donasi dan infaq Anda menjadi amal jariyah yang menopang
          operasional serta pembangunan Masjid An-Nur Arwana. Transfer ke
          rekening resmi di bawah ini, lalu unggah bukti transfer agar
          pengurus dapat memverifikasi.
        </p>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-hijau">
              Rekening tujuan
            </h2>

            {rekening.length === 0 ? (
              <div className="rounded-2xl border border-emas/30 bg-white p-6 shadow-sm">
                <p className="text-sm leading-relaxed text-hijau-tua/80">
                  Rekening tujuan akan segera diumumkan. Segera hubungi
                  pengurus untuk berdonasi.
                </p>
                {telp && (
                  <a
                    href={`tel:${telp.replace(/[^\d+]/g, '')}`}
                    className="mt-3 inline-block font-medium text-hijau transition hover:text-hijau-muda hover:underline"
                  >
                    {telp}
                  </a>
                )}
              </div>
            ) : (
              <ul className="space-y-4">
                {rekening.map((item) => (
                  <li
                    key={`${item.bank}-${item.no}`}
                    className="rounded-2xl border border-emas/30 bg-white p-6 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                      {item.bank}
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-hijau">
                      {item.no}
                    </p>
                    <p className="mt-1 text-sm text-hijau-tua/80">
                      a.n. {item.atasNama || 'Masjid An-Nur Arwana'}
                      {item.link && (
                        <>
                          {' · '}
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-hijau transition hover:text-hijau-muda hover:underline"
                          >
                            Buka
                          </a>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {telp && rekening.length > 0 && (
              <p className="text-xs leading-relaxed text-hijau-tua/70">
                Ada kendala transfer? Hubungi pengurus di{' '}
                <a
                  href={`tel:${telp.replace(/[^\d+]/g, '')}`}
                  className="font-medium text-hijau hover:underline"
                >
                  {telp}
                </a>
                .
              </p>
            )}
          </div>

          <DonationForm categories={categories} />
        </div>
      </div>
    </section>
  )
}
