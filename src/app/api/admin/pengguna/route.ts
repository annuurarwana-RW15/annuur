import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(request: Request) {
  await requireRole('ADMIN')

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const size = Number.parseInt(searchParams.get('size') ?? '20', 10)
  const sort = searchParams.get('sort')
  const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

  const needle = q.trim()
  const clauses: Prisma.UserWhereInput[] = []

  if (needle) {
    clauses.push({
      OR: [
        { name: { contains: needle, mode: 'insensitive' } },
        { email: { contains: needle, mode: 'insensitive' } },
      ],
    })
  }

  const where: Prisma.UserWhereInput = {
    AND: clauses,
  }

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === 'name'
      ? { name: dir }
      : sort === 'email'
        ? { email: dir }
        : { createdAt: dir }

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * size,
      take: size,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
  ])

  const formattedRows = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
  }))

  return new Response(JSON.stringify({ users: formattedRows, total }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
