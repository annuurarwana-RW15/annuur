import Link from 'next/link'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { formatRupiah } from '@/lib/format'
import type { DailyMonthSeries } from '@/lib/kas-daily'
import type { QrisInfo } from '@/lib/qris'
import { FinanceChart } from './FinanceChart'
import { SectionHeading } from './SectionHeading'

export function FinanceSummary({
  saldo,
  daily,
  qris,
  section,
}: {
  saldo: number | null
  daily: DailyMonthSeries
  qris: QrisInfo | null
  section?: Section | null
}) {
  if (section && !section.isVisible) return null

  const title = section?.title || 'Laporan Keuangan'
  const subjudul =
    asText(readField(section?.content, 'keuangan', 'subjudul')) || 'Saldo kas periode berjalan'
  const text = asText(readField(section?.content, 'keuangan', 'text'))

  return (
    <section
      id="laporan-keuangan"
      aria-labelledby="kas-judul"
      className="ornament bg-hijau text-krem"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading id="kas-judul" light>
              {title}
            </SectionHeading>
            <p className="mt-6 font-display text-4xl font-bold text-emas sm:text-5xl">
              {saldo === null ? '—' : formatRupiah(saldo)}
            </p>
            <p className="mt-2 text-sm text-krem/75">
              {subjudul}
            </p>
            {text && (
              <p className="mt-3 text-xs sm:text-sm text-krem/80 leading-relaxed max-w-md">
                {text}
              </p>
            )}
            <Link
              href="/laporan-kas"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-emas px-6 py-3 font-semibold text-hijau transition hover:bg-emas-muda shadow-sm"
            >
              Lihat laporan lengkap
            </Link>

            {qris && (
              <figure className="mt-6 flex w-fit max-w-full items-center gap-3 rounded-2xl bg-krem px-4 py-3 text-hijau shadow-sm ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- gambar hasil upload admin (R2/lokal), next/image tidak cocok */}
                <img
                  src={qris.image}
                  alt="Kode QRIS donasi"
                  width={64}
                  height={64}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain p-1"
                />
                <figcaption className="min-w-0">
                  <p className="text-sm font-bold leading-tight">
                    Donasi via QRIS
                  </p>
                  {qris.caption && (
                    <p className="mt-0.5 truncate text-xs text-hijau/75">
                      {qris.caption}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-hijau/60">
                    Pindai untuk berdonasi
                  </p>
                </figcaption>
              </figure>
            )}
          </div>

          <div>
            <FinanceChart points={daily.points} bulan={daily.bulan} />
          </div>
        </div>
      </div>
    </section>
  )
}
