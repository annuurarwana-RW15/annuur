import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatRupiah } from '@/lib/format'
import { getActivePeriod, getPeriodBalance, listTransactions } from '@/lib/kas'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { TransactionForm } from './TransactionForm'
import { TransactionsTable } from './TransactionsTable'

export const metadata: Metadata = {
  title: 'Transaksi Kas — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const CARD_STYLES = [
  {
    label: 'Total Masuk',
    cardClass: 'border-green-100 bg-green-50',
    valueClass: 'text-green-800',
  },
  {
    label: 'Total Keluar',
    cardClass: 'border-red-100 bg-red-50',
    valueClass: 'text-red-700',
  },
  {
    label: 'Saldo',
    cardClass: 'border-amber-100 bg-amber-50',
    valueClass: 'text-amber-900',
  },
] as const

function SummaryCards({
  balance,
}: {
  balance: { masuk: number; keluar: number; saldo: number }
}) {
  const values = [balance.masuk, balance.keluar, balance.saldo]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARD_STYLES.map((card, index) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 shadow-sm ${card.cardClass}`}
        >
          <p className="text-sm text-neutral-500">{card.label}</p>
          <p
            className={`mt-2 text-2xl font-semibold tabular-nums ${card.valueClass}`}
          >
            {formatRupiah(values[index])}
          </p>
        </div>
      ))}
    </div>
  )
}

export default async function TransaksiKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams

  // Mode form via ?edit=new / ?edit=<id> — daftar tampil bila tanpa `edit`.
  const edit = first(sp.edit)
  if (edit) {
    const transaction =
      edit === 'new'
        ? undefined
        : await db.transaction.findUnique({
            where: { id: edit },
            include: { period: { select: { status: true } } },
          })
    if (edit !== 'new' && !transaction) notFound()

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, isActive: true },
    })

    const isClosed = transaction?.period.status === 'DITUTUP'

    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {transaction ? 'Edit transaksi' : 'Transaksi baru'}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Transaksi baru selalu masuk ke periode berstatus AKTIF.
            </p>
          </div>
          <Link
            href="/admin/kas/transaksi"
            className="text-sm font-medium text-green-900 hover:underline"
          >
            ← Kembali ke daftar
          </Link>
        </div>

        {isClosed ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Periode transaksi ini sudah ditutup — perubahan & penghapusan
            diblokir.
          </p>
        ) : null}

        <TransactionForm
          {...(transaction
            ? {
                transaction: {
                  id: transaction.id,
                  type: transaction.type,
                  amount: Number(transaction.amount),
                  date: toDateInputValue(transaction.date),
                  description: transaction.description,
                  categoryId: transaction.categoryId,
                  receiptImage: transaction.receiptImage,
                },
              }
            : {})}
          categories={categories}
        />
      </div>
    )
  }

  const { q, page, size, sort, dir } = getTableParams(sp)
  const type = first(sp.type) ?? ''
  const categoryId = first(sp.categoryId) ?? ''
  const from = first(sp.from) ?? ''
  const to = first(sp.to) ?? ''

  const period = await getActivePeriod()

  if (!period) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Transaksi Kas
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Catat pemasukan & pengeluaran kas masjid per periode.
            </p>
          </div>
        </div>

        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Tidak ada periode aktif — buka periode dulu.{' '}
          <Link
            href="/admin/kas/periode"
            className="font-semibold underline hover:text-amber-700"
          >
            Buka periode
          </Link>
        </p>

        <div className="mt-4">
          <SummaryCards balance={{ masuk: 0, keluar: 0, saldo: 0 }} />
        </div>

        <div className="mt-4">
          <TransactionsTable
            rows={[]}
            total={0}
            page={1}
            pageSize={size}
            categories={[]}
          />
        </div>
      </div>
    )
  }

  const [balance, { rows, total }, categories] = await Promise.all([
    getPeriodBalance(period.id),
    // periodId dipass agar tabel memakai periode yang sama dengan kartu saldo
    // tanpa lookup aktif ganda.
    listTransactions({
      q,
      page,
      size,
      sort,
      dir,
      type,
      categoryId,
      from,
      to,
      periodId: period.id,
    }),
    db.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Transaksi Kas
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Periode aktif: <span className="font-medium">{period.name}</span> —
            saldo dihitung dari agregat masuk/keluar, bukan kolom tersimpan.
          </p>
        </div>
        <Link
          href="/admin/kas/transaksi?edit=new"
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          + Transaksi baru
        </Link>
      </div>

      <div className="mt-4">
        <SummaryCards balance={balance} />
      </div>

      <div className="mt-4">
        <TransactionsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={size}
          categories={categories}
        />
      </div>
    </div>
  )
}
