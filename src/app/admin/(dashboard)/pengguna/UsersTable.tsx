'use client'

import type { Role } from '@prisma/client'
import Link from 'next/link'
import { useTransition } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { saveUser } from './actions'

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

interface UsersTableProps {
  data: UserRow[]
  total: number
  page: number
  pageSize: number
  basePath: string
  searchPlaceholder: string
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  BENDAHARA: 'bg-amber-50 text-amber-800 border-amber-200',
  KONTEN: 'bg-sky-50 text-sky-800 border-sky-200',
  VIEWER: 'bg-neutral-100 text-neutral-600 border-neutral-200',
}

export function UsersTable({
  data,
  total,
  page,
  pageSize,
  basePath,
  searchPlaceholder,
}: UsersTableProps) {
  const [pending, startTransition] = useTransition()

  function toggleActive(row: UserRow) {
    startTransition(async () => {
      await saveUser({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as Role,
        isActive: !row.isActive,
      })
    })
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-neutral-900">{row.name}</p>
          <p className="text-xs text-neutral-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
            ROLE_BADGE[row.role] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
          }`}
        >
          {row.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <button
          type="button"
          onClick={() => toggleActive(row)}
          disabled={pending}
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium transition disabled:opacity-60 ${
            row.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-neutral-200 bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          }`}
          title="Klik untuk mengubah status"
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </button>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <Link
          href={`${basePath}?edit=${row.id}`}
          className="text-sm font-medium text-hijau hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath={basePath}
      searchPlaceholder={searchPlaceholder}
      exportFilename="pengguna"
    />
  )
}
