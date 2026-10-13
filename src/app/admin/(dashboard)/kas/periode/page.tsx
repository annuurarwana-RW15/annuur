import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { PeriodeTable } from './PeriodeTable'

export const metadata: Metadata = {
  title: 'Periode Kas — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function orderByClause(
  sort: string | undefined,
  dir: 'asc' | 'desc' | undefined,
): Prisma.PeriodOrderByWithRelationInput {
  const direction = dir === 'asc' ? 'asc' : 'desc'
  if (sort === 'name') return { name: direction }
  if (sort === 'startDate') return { startDate: direction }
  if (sort === 'closedAt') return { closedAt: direction }
  return { startDate: direction }
}

export default async function PeriodeKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const { q, page, size, sort, dir } = getTableParams(sp)
  const needle = q.trim()

  const where: Prisma.PeriodWhereInput | undefined = needle
    ? { name: { contains: needle, mode: 'insensitive' } }
    : undefined

  const [total, rows] = await Promise.all([
    db.period.count({ where }),
    db.period.findMany({
      where,
      orderBy: orderByClause(sort, dir),
      skip: (page - 1) * size,
      take: size,
    }),
  ])

  // closedBy hanya berisi id (tanpa relasi di schema) → petakan id → nama.
  const closedIds = [...new Set(rows.map((row) => row.closedBy).filter((id): id is string => Boolean(id)))]
  const users = closedIds.length
    ? await db.user.findMany({
        where: { id: { in: closedIds } },
        select: { id: true, name: true },
      })
    : []
  const userNameById: Record<string, string> = Object.fromEntries(
    users.map((user) => [user.id, user.name]),
  )

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Periode Kas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Transaksi selalu masuk ke periode berstatus AKTIF. Tutup periode lama
            sebelum membuka periode baru.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <PeriodeTable
          rows={rows}
          total={total}
          page={page}
          pageSize={size}
          userNameById={userNameById}
        />
      </div>
    </div>
  )
}
