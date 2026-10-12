import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { KategoriTable } from './KategoriTable'
import { CategoryForm } from './form'

export const metadata: Metadata = {
  title: 'Kategori Kas — Admin Masjid An-Nur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// Category tidak punya createdAt (binding model) → satu-satunya kolom sortable 'name'.
function orderByClause(
  sort: string | undefined,
  dir: 'asc' | 'desc' | undefined,
): Prisma.CategoryOrderByWithRelationInput {
  if (sort === 'name') return { name: dir === 'desc' ? 'desc' : 'asc' }
  return { name: 'asc' }
}

export default async function KategoriKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams

  // Mode form via ?edit=new / ?edit=<id> — daftar tampil bila tanpa `edit`.
  const edit = first(sp.edit)
  if (edit) {
    const category =
      edit === 'new' ? undefined : await db.category.findUnique({ where: { id: edit } })
    if (edit !== 'new' && !category) notFound()

    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {category ? 'Edit kategori' : 'Kategori baru'}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Kategori dipakai pada transaksi masuk & keluar kas.
            </p>
          </div>
          <Link
            href="/admin/kas/kategori"
            className="text-sm font-medium text-green-900 hover:underline"
          >
            ← Kembali ke daftar
          </Link>
        </div>
        <CategoryForm {...(category ? { category } : {})} />
      </div>
    )
  }

  const { q, page, size, sort, dir } = getTableParams(sp)
  const needle = q.trim()

  const where: Prisma.CategoryWhereInput | undefined = needle
    ? { name: { contains: needle, mode: 'insensitive' } }
    : undefined

  const [total, rows] = await Promise.all([
    db.category.count({ where }),
    db.category.findMany({
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
          <h1 className="text-2xl font-semibold text-neutral-900">Kategori Kas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kelola kategori pemasukan & pengeluaran kas masjid.
          </p>
        </div>
        <Link
          href="/admin/kas/kategori?edit=new"
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          + Kategori baru
        </Link>
      </div>

      <div className="mt-4">
        <KategoriTable rows={rows} total={total} page={page} pageSize={size} />
      </div>
    </div>
  )
}
