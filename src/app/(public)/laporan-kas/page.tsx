import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getActivePeriod } from '@/lib/kas'
import { getSetting } from '@/lib/settings'
import { getTableParams } from '@/lib/table-query'
import {
  applyTableControls,
  publicKeterangan,
  type PublicLaporanRow,
  type PublicTransactionRow,
} from './rows'
import { buildMonthlyTrend } from './trend'
import { PublicLaporanTable } from './PublicLaporanTable'
import { KasTrendChart } from './KasTrendChart'
import { LaporanKasTabs } from './LaporanKasTabs'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Laporan Kas Publik',
    description: 'Laporan kas publik Masjid An-nuur Arwana',
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

interface CategorySummary {
  categoryId: string
  categoryName: string
  masuk: number
  keluar: number
  saldo: number
  terbarik: Date | null
}

function categorySummary(
  catIds: string[],
  transactions: {
    type: 'MASUK' | 'KELUAR'
    amount: unknown
    createdAt: Date
    category: { id: string; name: string }
  }[],
  names: Map<string, string>,
): CategorySummary[] {
  const map = new Map(
    catIds.map((id) => [id, { masuk: 0, keluar: 0, terbarik: null as Date | null }]),
  )

  for (const tx of transactions) {
    const entry = map.get(tx.category.id)
    if (!entry) continue
    const amount = Number(tx.amount)
    if (tx.type === 'MASUK') entry.masuk += amount
    else entry.keluar += amount
    if (!entry.terbarik || tx.createdAt > entry.terbarik) {
      entry.terbarik = tx.createdAt
    }
  }

  return catIds.map((id) => {
    const entry = map.get(id)!
    return {
      categoryId: id,
      categoryName: names.get(id) ?? '—',
      masuk: entry.masuk,
      keluar: entry.keluar,
      saldo: entry.masuk - entry.keluar,
      terbarik: entry.terbarik,
    }
  })
}

export default async function LaporanKasPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const kategoriParam = first(sp.kategori)
  const tableParams = getTableParams(sp)

  const [period, publicCatRaw, allCategories] = await Promise.all([
    getActivePeriod(),
    getSetting<string[] | undefined>('kas.publicCategories', undefined),
    db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!period) {
    return (
      <section className="p-6">
        <p className="text-rose-600">Belum ada periode aktif</p>
      </section>
    )
  }

  let publicCatIds: string[]
  if (publicCatRaw && publicCatRaw.length > 0) {
    const keys = publicCatRaw.map((key) => String(key))
    publicCatIds = allCategories
      .filter((c) => keys.includes(c.id) || keys.includes(c.name))
      .map((c) => c.id)
  } else {
    publicCatIds = allCategories.filter((c) => c.type === 'MASUK').map((c) => c.id)
  }

  const categoryNames = new Map(allCategories.map((c) => [c.id, c.name]))
  const activeCategoryId =
    kategoriParam && publicCatIds.includes(kategoriParam) ? kategoriParam : undefined

  const transactions = await db.transaction.findMany({
    where: {
      periodId: period.id,
      AND: publicCatIds.length > 0
        ? { categoryId: { in: activeCategoryId ? [activeCategoryId] : publicCatIds } }
        : undefined,
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const catIds = activeCategoryId ? [activeCategoryId] : publicCatIds
  const summaries = categorySummary(catIds, transactions, categoryNames).map((row) => ({
    ...row,
    terbarik: row.terbarik ? row.terbarik.toISOString() : null,
  }))

  const rows: PublicLaporanRow[] = summaries
  const controlled = applyTableControls(rows, tableParams)

  // Dipakai grafik tren: transaksi yang sama dengan yang diringkas di atas
  // (sudah tersaring kategori publik & periode aktif) → konsisten dengan tabel.
  const txRows: PublicTransactionRow[] = transactions.map((tx) => ({
    id: tx.id,
    tanggal: tx.date.toISOString().split('T')[0],
    jenis: tx.type,
    kategoriName: tx.category.name,
    nominal: Number(tx.amount),
    keterangan: publicKeterangan(tx.description, tx.donationId),
    receiptImage: tx.receiptImage,
  }))
  const trend = buildMonthlyTrend(txRows, 12)

  return (
    <section className="p-6">
      <LaporanKasTabs />

      <h2 className="font-display text-2xl font-bold mb-6">
        Laporan Kas Publik
        {activeCategoryId
          ? ` — ${categoryNames.get(activeCategoryId) ?? ''}`
          : ''}
      </h2>

      <div className="mb-6">
        <KasTrendChart points={trend} />
      </div>

      <PublicLaporanTable
        rows={controlled.rows}
        total={controlled.total}
        page={tableParams.page}
        pageSize={tableParams.size}
        activeCategoryId={activeCategoryId}
      />

      {activeCategoryId && (
        <p className="mt-4">
          <Link
            href="/laporan-kas"
            className="font-medium text-hijau hover:underline"
          >
            ← Kembali ke semua kategori
          </Link>
        </p>
      )}

      <div className="mt-6 pt-6 border-t border-emas/20 text-sm text-hijau-tua/80">
        <p>
          Laporan ini dibuat berdasarkan data transaksi yang tercatat di{' '}
          {period.status === 'AKTIF' ? 'periode aktif' : 'periode saat ini'}.
          Untuk konfirmasi donasi, kunjungi pengurus.
        </p>
        <div className="mt-3">
          <a href="/donasi" className="font-medium text-hijau hover:underline">
            Link Donasi
          </a>
        </div>
      </div>
    </section>
  )
}
