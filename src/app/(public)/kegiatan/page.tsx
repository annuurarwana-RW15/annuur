import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { ArticleCard } from '@/components/public/ArticleCard'
import { SectionHeading } from '@/components/public/SectionHeading'

export const revalidate = 60

export const metadata: Metadata = { title: 'Kegiatan & Pengumuman' }

const LATEST = 12

export default async function KegiatanPage() {
  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: LATEST,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      category: true,
    },
  })

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">Kegiatan &amp; Pengumuman</SectionHeading>

        {articles.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada kegiatan</p>
        ) : (
          <>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <li key={article.slug} className="h-full">
                  <ArticleCard article={article} showCategory />
                </li>
              ))}
            </ul>
            {articles.length === LATEST && (
              <p className="mt-6 text-sm text-hijau-tua/70">
                Menampilkan {LATEST} kegiatan terbaru.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
