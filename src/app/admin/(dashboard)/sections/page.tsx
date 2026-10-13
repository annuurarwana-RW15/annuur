import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { SectionForm } from './SectionForm'
import { SectionsTable } from './SectionsTable'
import { asContentObject } from './section-content'

export const metadata: Metadata = {
  title: 'Sections — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function SectionsPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'KONTEN')

  const sp = await searchParams
  const { q } = getTableParams(sp)
  const needle = q.trim().toLowerCase()

  const sections = await db.section.findMany({ orderBy: { order: 'asc' } })
  const rows = needle
    ? sections.filter(
        (section) =>
          section.title.toLowerCase().includes(needle) ||
          section.key.toLowerCase().includes(needle),
      )
    : sections

  const editId = first(sp.edit)
  const editing = editId ? sections.find((section) => section.id === editId) : undefined
  const backHref = needle
    ? `/admin/sections?q=${encodeURIComponent(needle)}`
    : '/admin/sections'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Sections</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Atur tampilan, isi, dan urutan section situs publik.
      </p>

      {editing ? (
        <SectionForm
          key={editing.id}
          section={{
            id: editing.id,
            key: editing.key,
            title: editing.title,
            content: asContentObject(editing.content),
          }}
          backHref={backHref}
        />
      ) : null}

      <div className="mt-4">
        <SectionsTable
          sections={rows}
          orderedIds={sections.map((section) => section.id)}
          needle={needle}
        />
      </div>
    </div>
  )
}
