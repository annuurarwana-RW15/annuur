import Link from 'next/link'
import { formatRupiah } from '@/lib/format'
import type { DailyMonthSeries } from '@/lib/kas-daily'
import type { QrisInfo } from '@/lib/qris'
import { FinanceChart } from './FinanceChart'
import { SectionHeading } from './SectionHeading'

export function FinanceSummary({
  saldo,
  daily,
  qris,
}: {
  saldo: number | null
  daily: DailyMonthSeries
  qris: QrisInfo | null
}) {
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
              Laporan Keuangan
            </SectionHeading>
            <p className="mt-6 font-display text-4xl font-bold text-emas sm:text-5xl">
              {saldo === null ? '—' : formatRupiah(saldo)}
            </p>
            <p className="mt-2 text-sm text-krem/75">
              Saldo kas periode berjalan
            </p>
            <Link
              href="/laporan-kas"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-emas px-6 py-3 font-semibold text-hijau transition hover:bg-emas-muda"
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

          <FinanceChart points={daily.points} bulan={daily.bulan} />
        </div>
      </div>
    </section>
  )
}
