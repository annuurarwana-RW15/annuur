import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { TableParams } from '@/lib/table-query'

/** Periode berstatus AKTIF (satu-satunya target transaksi baru). */
export async function getActivePeriod() {
  return db.period.findFirst({
    where: { status: 'AKTIF' },
    orderBy: { startDate: 'desc' },
  })
}

export interface PeriodBalance {
  masuk: number
  keluar: number
  saldo: number
}

/** Agregat SUM(MASUK) − SUM(KELUAR) per periode — saldo tidak pernah disimpan di kolom. */
export async function getPeriodBalance(periodId: string): Promise<PeriodBalance> {
  const grouped = await db.transaction.groupBy({
    by: ['type'],
    where: { periodId },
    _sum: { amount: true },
  })
  const totals = new Map(
    grouped.map((row) => [row.type, Number(row._sum.amount ?? 0)]),
  )
  const masuk = totals.get('MASUK') ?? 0
  const keluar = totals.get('KELUAR') ?? 0
  return { masuk, keluar, saldo: masuk - keluar }
}

/** Baris transaksi dengan Decimal sudah dikonversi ke number (serializable ke client). */
export interface TransactionRow {
  id: string
  type: 'MASUK' | 'KELUAR'
  amount: number
  date: Date
  description: string
  receiptImage: string | null
  createdAt: Date
  category: { id: string; name: string; color: string | null } | null
  /** Field flat untuk export CSV/Excel (kolom `category` berisi object → empty cell). */
  categoryName: string | null
  categoryColor: string | null
}

export interface TxListParams extends TableParams {
  type?: string
  categoryId?: string
  from?: string
  to?: string
  /** Opsional: periode sudah diketahui pemanggil (kartu saldo & tabel satu lookup). */
  periodId?: string
}

function orderByClause(
  sort: string | undefined,
  dir: 'asc' | 'desc' | undefined,
): Prisma.TransactionOrderByWithRelationInput {
  const direction = dir === 'asc' ? 'asc' : 'desc'
  if (sort === 'amount') return { amount: direction }
  if (sort === 'createdAt') return { createdAt: direction }
  return { date: direction }
}

function dateOrUndefined(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  if (endOfDay) d.setUTCHours(23, 59, 59, 999)
  return d
}

function mapRow(row: {
  id: string
  type: 'MASUK' | 'KELUAR'
  amount: unknown
  date: Date
  description: string
  receiptImage: string | null
  createdAt: Date
  category: { id: string; name: string; color: string | null } | null
}): TransactionRow {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    description: row.description,
    receiptImage: row.receiptImage,
    createdAt: row.createdAt,
    category: row.category,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
  }
}

/**
 * Daftar transaksi periode AKTIF dengan filter & paginasi server.
 * `periodId` opsional menghindari lookup ganda bila pemanggil sudah punya
 * periode aktif (kartu saldo & tabel konsisten satu query).
 * Tanpa periode aktif -> daftar kosong (periode DITUTUP memblokir semua mutasi).
 */
export interface KasMonth {
  month: string
  masuk: number
  keluar: number
}

/** 6 bulan kebelakangan dari transaksi MASUK/KELUAR, mengelompokkan per bulan. */
export async function kasMonthly(months: number = 6): Promise<KasMonth[]> {
  const now = new Date()
  const result: KasMonth[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(now.getMonth() - i)
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const grouped = await db.transaction.groupBy({
      by: ['type'],
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    })
    const totals = new Map(
      grouped.map((row) => [row.type, Number(row._sum.amount ?? 0)]),
    )
    result.push({
      month: startOfMonth.toLocaleString('id-ID', { month: 'long' }),
      masuk: totals.get('MASUK') ?? 0,
      keluar: totals.get('KELUAR') ?? 0,
    })
  }
  return result
}

export async function listTransactions(
  p: TxListParams,
): Promise<{ rows: TransactionRow[]; total: number }> {
  const periodId = p.periodId ?? (await getActivePeriod())?.id
  if (!periodId) return { rows: [], total: 0 }

  const needle = p.q.trim()
  const clauses: Prisma.TransactionWhereInput[] = []

  if (p.type === 'MASUK' || p.type === 'KELUAR') clauses.push({ type: p.type })
  if (p.categoryId) clauses.push({ categoryId: p.categoryId })

  const gte = dateOrUndefined(p.from)
  if (gte) clauses.push({ date: { gte } })
  const lte = dateOrUndefined(p.to, true)
  if (lte) clauses.push({ date: { lte } })

  if (needle) {
    clauses.push({
      OR: [
        { description: { contains: needle, mode: 'insensitive' } },
        { category: { name: { contains: needle, mode: 'insensitive' } } },
      ],
    })
  }

  const where: Prisma.TransactionWhereInput = {
    periodId,
    AND: clauses,
  }

  const [total, rows] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: orderByClause(p.sort, p.dir),
      skip: (p.page - 1) * p.size,
      take: p.size,
    }),
  ])

  return { rows: rows.map(mapRow), total }
}
