import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(request: Request) {
  await requireRole('ADMIN', 'BENDAHARA')

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get('periodId')
  const q = searchParams.get('q') || ''
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const size = Number.parseInt(searchParams.get('size') ?? '10', 10)
  const sort = searchParams.get('sort')
  const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

  const needle = q.trim()
  const clauses: Prisma.TransactionWhereInput[] = []

  if (periodId) clauses.push({ periodId })
  else clauses.push({ periodId: undefined }) // fallback jika periode tidak ada

  if (needle) {
    clauses.push({
      OR: [
        { description: { contains: needle, mode: 'insensitive' } },
        { category: { name: { contains: needle, mode: 'insensitive' } } },
      ],
    })
  }

  const where: Prisma.TransactionWhereInput = {
    AND: clauses,
  }

  const orderBy: Prisma.TransactionOrderByWithRelationInput =
    sort === 'description'
      ? { description: dir }
      : sort === 'amount'
        ? { amount: dir }
        : { date: dir }

  const [total, rows] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy,
      skip: (page - 1) * size,
      take: size,
    }),
  ])

  const formattedRows = rows.map((row) => ({
    id: row.id,
    tanggal: row.date.toISOString().split('T')[0],
    kategori: row.category?.name ?? null,
    keterangan: row.description,
    masuk: row.type === 'MASUK' ? Number(row.amount) : 0,
    keluar: row.type === 'KELUAR' ? Number(row.amount) : 0,
  }))

  return new Response(
    JSON.stringify({ rows: formattedRows, total }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}