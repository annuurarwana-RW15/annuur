import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatDateID, formatRupiah } from '@/lib/format'
import { requireRole } from '@/lib/rbac'
import { getTableParams, PAGE_SIZES } from '@/lib/table-query'
import {
  buildJurnal,
  filterJournal,
  journalTotals,
  sortJournal,
  type JournalFilter,
} from '@/lib/jurnal'
import { LaporanTabs } from '../LaporanTabs'
import { JurnalTable } from '../JurnalTable'

export const metadata: Metadata = {
  title: 'Jurnal Kas — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DEFAULT_JURNAL_SIZE = 50

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function JurnalKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const { q, page, sort, dir } = getTableParams(sp)
  const periodParam = first(sp.period)
  const categoryParam = first(sp.category)
  const jenisParam = first(sp.jenis)
  const dariParam = first(sp.dari)
  const sampaiParam = first(sp.sampai)
  const urlSize = Number.parseInt(first(sp.size) ?? '', 10)
  const pageSize = (PAGE_SIZES as readonly number[]).includes(urlSize)
    ? urlSize
    : DEFAULT_JURNAL_SIZE

  const [periods, categories] = await Promise.all([
    db.period.findMany({ orderBy: { startDate: 'desc' } }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (periodParam && !periods.some((item) => item.id === periodParam)) notFound()
  if (categoryParam && !categories.some((item) => item.id === categoryParam)) notFound()
  if (jenisParam && jenisParam !== 'MASUK' && jenisParam !== 'KELUAR') notFound()

  const selectedPeriod = periodParam
    ? periods.find((item) => item.id === periodParam)
    : (periods.find((item) => item.status === 'AKTIF') ?? periods[0])
  const selectedCategory = categoryParam
    ? categories.find((item) => item.id === categoryParam)
    : undefined

  if (!selectedPeriod) {
    return (
      <div className="no-print">
        <LaporanTabs />
        <h1 className="text-2xl font-semibold text-neutral-900">Jurnal Kas</h1>
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Belum ada periode kas — buka periode dulu di halaman Periode.
        </p>
      </div>
    )
  }

  const { saldoAwal, entries } = await buildJurnal(selectedPeriod.id)

  const jenis = jenisParam === 'MASUK' || jenisParam === 'KELUAR' ? jenisParam : undefined
  const filter: JournalFilter = {
    ...(q ? { q } : {}),
    ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
    ...(jenis ? { jenis } : {}),
    ...(dariParam ? { dari: dariParam } : {}),
    ...(sampaiParam ? { sampai: sampaiParam } : {}),
  }

  const filtered = filterJournal(entries, filter)
  // Hanya Tanggal yang sortable; sort desc = balik urutan kronologis, saldo tidak dihitung ulang.
  const ordered = sortJournal(filtered, sort === 'tanggal' && dir === 'desc' ? 'desc' : 'asc')

  const totals = journalTotals(entries) // invarian — seluruh periode
  const subtotal = journalTotals(filtered) // subtotal terfilter — tidak menggantikan kartu
  const saldoAkhir = saldoAwal + totals.net

  const total = ordered.length
  const start = (page - 1) * pageSize
  const pageRows = ordered.slice(start, start + pageSize)

  const filterActive = Boolean(
    filter.q || filter.categoryId || filter.jenis || filter.dari || filter.sampai,
  )

  const generatedAt = formatDateID(new Date())
  const controlClass =
    'rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-neutral-700'

  const cards = [
    {
      label: 'Saldo Awal (periode sebelumnya)',
      value: saldoAwal,
      cardClass: 'border-neutral-200 bg-neutral-50',
      valueClass: 'text-neutral-800',
    },
    {
      label: 'Total Masuk',
      value: totals.totalMasuk,
      cardClass: 'border-green-100 bg-green-50',
      valueClass: 'text-green-800',
    },
    {
      label: 'Total Keluar',
      value: totals.totalKeluar,
      cardClass: 'border-red-100 bg-red-50',
      valueClass: 'text-red-700',
    },
    {
      label: 'Saldo Akhir',
      value: saldoAkhir,
      cardClass: 'border-amber-100 bg-amber-50',
      valueClass: 'text-amber-900',
    },
  ] as const

  return (
    <div>
      <div className="no-print">
        <LaporanTabs />

        <h1 className="text-2xl font-semibold text-neutral-900">Jurnal Kas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {`Periode ${selectedPeriod.name} (${formatDateID(selectedPeriod.startDate)} – ${formatDateID(selectedPeriod.endDate)})`}
          {' — dibuat '}
          {generatedAt}
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
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
            <select name="category" defaultValue={categoryParam ?? ''} className={controlClass}>
              <option value="">Semua</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Jenis</span>
            <select name="jenis" defaultValue={jenisParam ?? ''} className={controlClass}>
              <option value="">Semua</option>
              <option value="MASUK">Masuk</option>
              <option value="KELUAR">Keluar</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Dari</span>
            <input
              type="date"
              name="dari"
              defaultValue={dariParam ?? ''}
              className={controlClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Sampai</span>
            <input
              type="date"
              name="sampai"
              defaultValue={sampaiParam ?? ''}
              className={controlClass}
            />
          </label>

          <button
            type="submit"
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Terapkan
          </button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border p-4 shadow-sm ${card.cardClass}`}
            >
              <p className="text-sm text-neutral-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${card.valueClass}`}>
                {formatRupiah(card.value)}
              </p>
            </div>
          ))}
        </div>

        {filterActive ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-neutral-600">
              Menampilkan <strong>{total}</strong> dari <strong>{entries.length}</strong>{' '}
              entri — Saldo dihitung dari seluruh buku besar.
            </p>
            <p className="text-sm text-neutral-500">
              Subtotal terfilter (bukan kartu di atas): Masuk{' '}
              <span className="font-medium text-green-700">
                {formatRupiah(subtotal.totalMasuk)}
              </span>{' '}
              · Keluar{' '}
              <span className="font-medium text-red-600">
                {formatRupiah(subtotal.totalKeluar)}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <JurnalTable
          rows={pageRows}
          total={total}
          page={page}
          pageSize={pageSize}
          periodId={selectedPeriod.id}
          filter={filter}
        />
      </div>
    </div>
  )
}
