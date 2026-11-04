import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { absoluteUrl } from '@/lib/seo'
import surahsData from '@/lib/quran-surahs.json'

export const revalidate = 3600

/** Halaman statis publik utama. */
const STATIC_PATHS: {
  path: string
  priority: number
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/profil', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/kegiatan', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/berita', priority: 0.9, changeFrequency: 'daily' },
  { path: '/quran', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/laporan-kas', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/laporan-kas/transaksi', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/donasi', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/donasi/status', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/galeri', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/kontak', priority: 0.7, changeFrequency: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let contentUpdated = new Date()
  let articles: { slug: string; updatedAt: Date }[] = []

  try {
    const [sectionsResult, articlesResult] = await Promise.all([
      db.section.aggregate({ _max: { updatedAt: true } }),
      db.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
    ])
    if (sectionsResult._max.updatedAt) {
      contentUpdated = sectionsResult._max.updatedAt
    }
    articles = articlesResult
  } catch (error) {
    console.error(
      '[sitemap] Gagal mengambil data dinamis dari database, memakai fallback rute statis:',
      error,
    )
  }

  // 1. Rute statis utama
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: contentUpdated,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // 2. Artikel Berita Dinamis
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/berita/${article.slug}`),
    lastModified: article.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // 3. Al-Qur'an Digital: 114 Surah terindeks individual oleh Google
  const quranEntries: MetadataRoute.Sitemap = (surahsData as { nomor: number }[]).map(
    (surah) => ({
      url: absoluteUrl(`/quran/${surah.nomor}`),
      lastModified: contentUpdated,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  )

  return [...staticEntries, ...articleEntries, ...quranEntries]
}
