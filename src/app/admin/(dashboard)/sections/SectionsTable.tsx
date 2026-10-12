'use client'

import type { Section } from '@prisma/client'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { ReorderCell } from './ReorderCell'
import { ToggleCell } from './ToggleCell'

interface SectionsTableProps {
  /** Baris yang ditampilkan (sudah difilter search di server). */
  sections: Section[]
  /** Urutan penuh (tanpa filter) untuk aksi ▲▼. */
  orderedIds: string[]
  /** Kata kunci pencarian aktif — reorder dinonaktifkan agar tidak menyesatkan. */
  needle: string
}

function editHref(id: string, needle: string): string {
  const params = new URLSearchParams()
  if (needle) params.set('q', needle)
  params.set('edit', id)
  return `/admin/sections?${params.toString()}`
}

/**
 * Pembungkus client: kolom berisi `render` (fungsi) tidak bisa diserialisasi dari
 * Server Component ke `DataTable` yang berupa client component, sehingga kolom
 * didefinisikan di lapisan client.
 */
export function SectionsTable({ sections, orderedIds, needle }: SectionsTableProps) {
  const columns: Column<Section>[] = [
    {
      key: 'title',
      label: 'Section',
      render: (row) => (
        <div>
          <p className="font-medium text-neutral-900">{row.title}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{row.key}</p>
        </div>
      ),
    },
    {
      key: 'isVisible',
      label: 'Status',
      render: (row) => (
        <ToggleCell id={row.id} title={row.title} visible={row.isVisible} />
      ),
    },
    {
      key: 'order',
      label: 'Urutan',
      align: 'right',
      render: (row) => (
        <ReorderCell
          id={row.id}
          title={row.title}
          orderedIds={orderedIds}
          disabled={Boolean(needle)}
        />
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => (
        <Link
          href={editHref(row.id, needle)}
          className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-neutral-50"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={sections}
      total={sections.length}
      page={1}
      pageSize={100}
      searchPlaceholder="Cari section…"
      exportFilename="sections"
      basePath="/admin/sections"
    />
  )
}
