import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getActivePeriod } from '@/lib/kas'
import { getSetting } from '@/lib/settings'
import { getTableParams } from '@/lib/table-query'
import {
  applyTransactionControls,
  publicKeterangan,
  type PublicTransactionRow,
} from '../rows'
import { PublicTransactionTable } from '../PublicTransactionTable'
import { LaporanKasTabs } from '../LaporanKasTabs'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Daftar Transaksi — Laporan Kas Publik',
    description: 'Daftar transaksi kas publik Masjid An-nuur Arwana',
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function validDate(value: string | undefined): string | undefined {
  if (!value || !DATE_RE.test(value)) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const ok =
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  return ok ? value : undefined
}

const fieldClass =
  'rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'

export default async function DaftarTransaksiPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const kategoriParam = first(sp.kategori)
  const dari = validDate(first(sp.dari))
  const sampai = validDate(first(sp.sampai))
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
      ...(dari || sampai
        ? {
            date: {
              ...(dari ? { gte: new Date(`${dari}T00:00:00`) } : {}),
              ...(sampai ? { lte: new Date(`${sampai}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  })

  const txRows: PublicTransactionRow[] = transactions.map((tx) => ({
    id: tx.id,
    tanggal: tx.date.toISOString().split('T')[0],
    jenis: tx.type,
    kategoriName: tx.category.name,
    nominal: Number(tx.amount),
    keterangan: publicKeterangan(tx.description, tx.donationId),
    receiptImage: tx.receiptImage,
  }))

  const controlled = applyTransactionControls(txRows, tableParams)
  const resetHref = activeCategoryId
    ? `/laporan-kas/transaksi?kategori=${activeCategoryId}`
    : '/laporan-kas/transaksi'

  return (
    <section className="p-6">
      <LaporanKasTabs />

      <h2 className="font-display text-2xl font-bold mb-2">
        Daftar Transaksi
        {activeCategoryId ? ` — ${categoryNames.get(activeCategoryId) ?? ''}` : ''}
      </h2>
      <p className="mb-4 text-sm text-hijau-tua/70">
        Nama donatur tidak ditampilkan demi privasi.
      </p>

      <form
        method="get"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-emas/20 bg-krem/40 p-3"
      >
        {activeCategoryId && (
          <input type="hidden" name="kategori" value={activeCategoryId} />
        )}
        <label className="block text-sm text-hijau-tua">
          Dari
          <input
            type="date"
            name="dari"
            defaultValue={dari ?? ''}
            className={`${fieldClass} mt-1 block`}
          />
        </label>
        <label className="block text-sm text-hijau-tua">
          Sampai
          <input
            type="date"
            name="sampai"
            defaultValue={sampai ?? ''}
            className={`${fieldClass} mt-1 block`}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-hijau px-4 py-2 text-sm font-semibold text-krem hover:bg-hijau-tua"
        >
          Terapkan
        </button>
        {dari || sampai ? (
          <Link
            href={resetHref}
            className="text-sm font-medium text-hijau hover:underline"
          >
            Reset tanggal
          </Link>
        ) : null}
      </form>

      <PublicTransactionTable
        rows={controlled.rows}
        total={controlled.total}
        page={tableParams.page}
        pageSize={tableParams.size}
      />

      {activeCategoryId && (
        <p className="mt-4">
          <Link
            href="/laporan-kas/transaksi"
            className="font-medium text-hijau hover:underline"
          >
            ← Kembali ke semua kategori
          </Link>
        </p>
      )}
    </section>
  )
}
