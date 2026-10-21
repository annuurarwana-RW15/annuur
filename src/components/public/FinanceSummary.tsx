import Link from 'next/link'
import { formatRupiah } from '@/lib/format'
import type { DailyMonthSeries } from '@/lib/kas-daily'
import { FinanceChart } from './FinanceChart'
import { SectionHeading } from './SectionHeading'

export function FinanceSummary({
  saldo,
  daily,
}: {
  saldo: number | null
  daily: DailyMonthSeries
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
          </div>

          <FinanceChart points={daily.points} bulan={daily.bulan} />
        </div>
      </div>
    </section>
  )
}
