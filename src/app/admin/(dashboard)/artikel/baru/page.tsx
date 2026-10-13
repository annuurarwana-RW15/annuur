import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { ArticleForm } from '../ArticleForm'
import { listArticleCategories } from '../categories'

export const metadata: Metadata = {
  title: 'Artikel Baru — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function NewArticlePage() {
  await requireRole('ADMIN', 'KONTEN')

  const categories = await listArticleCategories()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Artikel baru</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Tulis berita atau pengumuman untuk situs publik.
      </p>
      <ArticleForm categories={categories} />
    </div>
  )
}
