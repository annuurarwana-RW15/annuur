import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { ArticleForm } from '../ArticleForm'
import { listArticleCategories } from '../categories'

export const metadata: Metadata = {
  title: 'Edit Artikel — Admin Masjid An-Nur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: PageProps) {
  await requireRole('ADMIN', 'KONTEN')

  const { id } = await params
  const [article, categories] = await Promise.all([
    db.article.findUnique({ where: { id } }),
    listArticleCategories(),
  ])
  if (!article) notFound()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{article.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Perbarui isi, status, atau pengaturan SEO artikel.
      </p>
      <ArticleForm article={article} categories={categories} />
    </div>
  )
}
