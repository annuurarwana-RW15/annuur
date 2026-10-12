import Link from 'next/link'
import { formatRupiah } from '@/lib/format'
import { SectionHeading } from './SectionHeading'

export function FinanceSummary({ saldo }: { saldo: number | null }) {
  return (
    <section
      id="laporan-keuangan"
      aria-labelledby="kas-judul"
      className="ornament bg-hijau text-krem"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:flex-row sm:items-end sm:justify-between">
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
        </div>
        <Link
          href="/laporan-kas"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-emas px-6 py-3 font-semibold text-hijau transition hover:bg-emas-muda"
        >
          Lihat laporan lengkap
        </Link>
      </div>
    </section>
  )
}
