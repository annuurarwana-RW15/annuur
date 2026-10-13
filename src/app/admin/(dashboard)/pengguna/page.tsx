import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getTableParams } from '@/lib/table-query'
import { requireRole } from '@/lib/rbac'
import { UserForm, type UserFormData } from './UserForm'
import { UsersTable, type UserRow } from './UsersTable'

export const metadata: Metadata = {
  title: 'Kelola Pengguna — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PenggunaPage({ searchParams }: PageProps) {
  await requireRole('ADMIN')

  const sp = await searchParams
  const { q, page, size: pageSize } = getTableParams(sp)
  const editRaw = sp.edit
  const editId = typeof editRaw === 'string' ? editRaw : undefined

  const needle = q?.trim()
  const where = needle
    ? {
        OR: [
          { name: { contains: needle, mode: 'insensitive' as const } },
          { email: { contains: needle, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    }),
  ])

  let formInitial: UserFormData | null = null
  if (editId === 'new') {
    formInitial = { name: '', email: '', role: 'VIEWER', isActive: true }
  } else if (editId) {
    const found = await db.user.findUnique({
      where: { id: editId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })
    if (!found) redirect('/admin/pengguna')
    formInitial = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      isActive: found.isActive,
    }
  }

  const rows: UserRow[] = users.map((u) => ({ ...u, role: String(u.role) }))

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Pengguna</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total} akun terdaftar.
          </p>
        </div>
        <Link
          href="/admin/pengguna?edit=new"
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition"
        >
          Tambah Pengguna
        </Link>
      </div>

      {formInitial && (
        <div className="mt-6">
          <UserForm initial={formInitial} backHref="/admin/pengguna" />
        </div>
      )}

      <div className="mt-6">
        <UsersTable
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          basePath="/admin/pengguna"
          searchPlaceholder="Cari nama atau email…"
        />
      </div>
    </div>
  )
}
