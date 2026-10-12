import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { absoluteUrl } from '@/lib/seo'

export const revalidate = 3600

/** Halaman statis publik (rute Task 14/16 sudah masuk nav sejak Task 9). */
const STATIC_PATHS: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/profil', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/berita', priority: 0.9, changeFrequency: 'daily' },
  { path: '/kegiatan', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/galeri', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/kontak', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/laporan-kas', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/donasi', priority: 0.8, changeFrequency: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sections, articles] = await Promise.all([
    db.section.aggregate({ _max: { updatedAt: true } }),
    db.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ])
  // Setting tidak punya timestamp → pakai konten terakhir diperbarui, fallback "sekarang".
  const contentUpdated = sections._max.updatedAt ?? new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: contentUpdated,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/berita/${article.slug}`),
    lastModified: article.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticEntries, ...articleEntries]
}
