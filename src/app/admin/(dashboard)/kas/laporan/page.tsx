import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrintHeader } from '@/components/admin/PrintHeader'
import { asText } from '@/components/public/content'
import { db } from '@/lib/db'
import { formatDateID, formatRupiah } from '@/lib/format'
import { buildKasReport, KAS_REPORT_TITLE, sortReportRows } from '@/lib/report'
import { requireRole } from '@/lib/rbac'
import { getSetting } from '@/lib/settings'
import { getTableParams, PAGE_SIZES } from '@/lib/table-query'
import { LaporanTable } from './LaporanTable'
import { LaporanTabs } from './LaporanTabs'

export const metadata: Metadata = {
  title: 'Laporan Kas — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Baris laporan ≤ jumlah kategori -> default 100 (tetap bisa diubah via ?size=). */
const DEFAULT_REPORT_SIZE = 100

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function LaporanKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const { q, page, sort, dir } = getTableParams(sp)
  const periodParam = first(sp.period)
  const categoryParam = first(sp.category)
  const urlSize = Number.parseInt(first(sp.size) ?? '', 10)
  const pageSize = (PAGE_SIZES as readonly number[]).includes(urlSize)
    ? urlSize
    : DEFAULT_REPORT_SIZE

  const [periods, categories, siteNameRaw] = await Promise.all([
    db.period.findMany({ orderBy: { startDate: 'desc' } }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getSetting('site.name', 'Masjid An-nuur Arwana'),
  ])

  // id periode/kategori tak dikenal -> 404 (bukan laporan senyap untuk filter salah).
  if (periodParam && !periods.some((item) => item.id === periodParam)) notFound()
  if (categoryParam && !categories.some((item) => item.id === categoryParam)) notFound()

  const selectedPeriod = periodParam
    ? periods.find((item) => item.id === periodParam)
    : (periods.find((item) => item.status === 'AKTIF') ?? periods[0])
  const selectedCategory = categoryParam
    ? categories.find((item) => item.id === categoryParam)
    : undefined

  const siteName = asText(siteNameRaw, 'Masjid An-nuur Arwana')

  if (!selectedPeriod) {
    return (
      <div>
        <div className="no-print">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Laporan Keuangan Kas
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Rekap pemasukan & pengeluaran kas per periode.
          </p>
        </div>
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Belum ada periode kas — buka periode dulu di halaman Periode.
        </p>
      </div>
    )
  }

  const report = await buildKasReport({
    periodId: selectedPeriod.id,
    ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
  })

  // q menyaring baris kategori (server-side), sort dari kolom DataTable.
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? report.rows.filter((row) => row.kategori.toLowerCase().includes(needle))
    : report.rows
  const sorted = sortReportRows(filtered, sort, dir)
  const start = (page - 1) * pageSize
  const pageRows = sorted.slice(start, start + pageSize)

  const generatedAt = formatDateID(new Date())
  const controlClass =
    'rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-neutral-700'

  return (
    <div>
      <div className="no-print">
        <LaporanTabs />
      </div>
      <PrintHeader
        title={KAS_REPORT_TITLE}
        subtitle={report.periodLabel}
        meta={siteName}
      />

      <div className="no-print">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Laporan Keuangan Kas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {report.periodLabel} — dibuat {generatedAt}
          {selectedCategory ? ` · kategori ${selectedCategory.name}` : ''}
        </p>
      </div>

      <form
        method="get"
        className="no-print mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">Periode</span>
          <select name="period" defaultValue={selectedPeriod.id} className={controlClass}>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {`${item.name} (${formatDateID(item.startDate)} – ${formatDateID(item.endDate)})`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">Kategori</span>
          <select
            name="category"
            defaultValue={categoryParam ?? ''}
            className={controlClass}
          >
            <option value="">Semua</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Terapkan
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            { label: 'Total Masuk', value: report.total.masuk, cardClass: 'border-green-100 bg-green-50', valueClass: 'text-green-800' },
            { label: 'Total Keluar', value: report.total.keluar, cardClass: 'border-red-100 bg-red-50', valueClass: 'text-red-700' },
            { label: 'Saldo', value: report.total.saldo, cardClass: 'border-amber-100 bg-amber-50', valueClass: 'text-amber-900' },
          ] as const
        ).map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.cardClass}`}>
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${card.valueClass}`}>
              {formatRupiah(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <LaporanTable
          rows={pageRows}
          total={sorted.length}
          page={page}
          pageSize={pageSize}
          periodId={selectedPeriod.id}
          {...(selectedCategory ? { categoryId: selectedCategory.id } : {})}
        />
      </div>
    </div>
  )
}
