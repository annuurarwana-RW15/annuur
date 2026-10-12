import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { ArticlesTable } from './ArticlesTable'

export const metadata: Metadata = {
  title: 'Artikel — Admin Masjid An-Nur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function orderByClause(
  sort: string | undefined,
  dir: 'asc' | 'desc' | undefined,
): Prisma.ArticleOrderByWithRelationInput {
  const direction = dir === 'asc' ? 'asc' : 'desc'
  if (sort === 'title') return { title: direction }
  if (sort === 'viewCount') return { viewCount: direction }
  return { createdAt: direction }
}

export default async function ArtikelPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'KONTEN')

  const sp = await searchParams
  const { q, page, size, sort, dir } = getTableParams(sp)
  const needle = q.trim()

  const where: Prisma.ArticleWhereInput | undefined = needle
    ? {
        OR: [
          { title: { contains: needle, mode: 'insensitive' } },
          { excerpt: { contains: needle, mode: 'insensitive' } },
        ],
      }
    : undefined

  const [total, rows] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      orderBy: orderByClause(sort, dir),
      skip: (page - 1) * size,
      take: size,
    }),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Artikel</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Berita, pengumuman, dan kegiatan yang tampil di situs publik.
          </p>
        </div>
        <Link
          href="/admin/artikel/baru"
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          + Artikel baru
        </Link>
      </div>

      <div className="mt-4">
        <ArticlesTable rows={rows} total={total} page={page} pageSize={size} />
      </div>
    </div>
  )
}
