import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { galleryItems } from '@/components/public/content'
import { readField } from '../sections/section-content'
import { GaleriForm } from './GaleriForm'
import { GaleriTable, type GaleriRow } from './GaleriTable'

export const metadata: Metadata = {
  title: 'Galeri — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const buttonClass =
  'inline-flex items-center rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800'

export default async function GaleriPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'KONTEN')

  const sp = await searchParams
  const { q } = getTableParams(sp)
  const needle = q.trim().toLowerCase()
  const editParam = first(sp.edit)

  const backHref = needle
    ? `/admin/galeri?q=${encodeURIComponent(needle)}`
    : '/admin/galeri'
  const tambahHref = needle
    ? `${backHref}&edit=new`
    : `${backHref}?edit=new`

  const section = await db.section.findFirst({ where: { key: 'galeri' } })
  if (!section) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Galeri</h1>
        <p role="alert" className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Section galeri belum ada. Buat/aktifkan section ber-key `galeri` di menu
          Sections.
        </p>
      </div>
    )
  }

  // Index = posisi asli pada array `images` (sebelum filter) → aksi edit/hapus tepat.
  const all: GaleriRow[] = galleryItems(
    readField(section.content, 'galeri', 'images'),
  ).map((item, index) => ({ ...item, index }))

  const rows = needle
    ? all.filter(
        (row) =>
          row.caption.toLowerCase().includes(needle) ||
          row.url.toLowerCase().includes(needle),
      )
    : all

  const editingIndex =
    editParam === undefined || editParam === 'new'
      ? null
      : Number.parseInt(editParam, 10)
  const editingItem =
    editingIndex !== null &&
    Number.isInteger(editingIndex) &&
    editingIndex >= 0 &&
    editingIndex < all.length
      ? all[editingIndex]
      : null
  const showForm = editParam !== undefined && (editParam === 'new' || editingItem !== null)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Galeri</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Daftar foto galeri situs publik — tambah lewat upload gambar atau URL.
          </p>
        </div>
        <Link href={tambahHref} className={buttonClass}>
          + Tambah foto
        </Link>
      </div>

      {showForm ? (
        <GaleriForm
          key={editParam}
          item={editingItem}
          index={editingItem ? editingItem.index : null}
          backHref={backHref}
        />
      ) : null}

      <div className="mt-4">
        <GaleriTable items={rows} needle={needle} />
      </div>
    </div>
  )
}
