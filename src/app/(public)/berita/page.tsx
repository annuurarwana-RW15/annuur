import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { buildMetadata } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { ArticleCard } from '@/components/public/ArticleCard'
import { SectionHeading } from '@/components/public/SectionHeading'

const PAGE_SIZE = 12
const DEFAULT_SITE_NAME = 'Masjid An-nuur Arwana'

// CATATAN: route ini dinamis karena pagination server-side membaca `searchParams`
// — jangan tambahkan `export const revalidate` di sini (inert dan menyesatkan).
// ISR hanya berlaku di `/berita/[slug]`.
interface BeritaPageProps {
  searchParams: Promise<{ page?: string | string[] }>
}

function pageFrom(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export async function generateMetadata({
  searchParams,
}: BeritaPageProps): Promise<Metadata> {
  const [siteNameRaw, seoDescription, params] = await Promise.all([
    getSetting('site.name', DEFAULT_SITE_NAME),
    getSetting<unknown>('seo.description', ''),
    searchParams,
  ])
  const page = pageFrom(params.page)

  return buildMetadata({
    title: 'Berita & Artikel',
    description:
      asText(seoDescription) ||
      'Berita, pengumuman, dan artikel terbaru dari Masjid An-nuur Arwana',
    path: page > 1 ? `/berita?page=${page}` : '/berita',
    // openGraph eksplisit menimpa og:image warisan root opengraph-image
    // (lihat next resolve-metadata) → pakai gambar OG situs secara eksplisit.
    image: '/opengraph-image',
    siteName: asText(siteNameRaw, DEFAULT_SITE_NAME),
  })
}

const pageLinkClass =
  'rounded-full border border-emas/40 bg-white px-5 py-2 text-sm font-semibold text-hijau transition hover:bg-krem-tua'

export default async function BeritaPage({ searchParams }: BeritaPageProps) {
  const params = await searchParams
  const page = pageFrom(params.page)

  const total = await db.article.count({ where: { status: 'PUBLISHED' } })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (page > totalPages) notFound()

  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [
      { publishedAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      category: true,
      author: { select: { name: true } },
    },
  })

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">Berita &amp; Artikel</SectionHeading>

        {articles.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada artikel</p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug} className="h-full">
                <ArticleCard
                  article={{
                    title: article.title,
                    slug: article.slug,
                    excerpt: article.excerpt,
                    coverImage: article.coverImage,
                    publishedAt: article.publishedAt,
                    category: article.category,
                    authorName: article.author.name,
                  }}
                  showCategory
                />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Navigasi halaman berita"
            className="mt-10 flex items-center justify-between gap-4 border-t border-emas/25 pt-6"
          >
            {page > 1 ? (
              <Link
                rel="prev"
                href={page === 2 ? '/berita' : `/berita?page=${page - 1}`}
                className={pageLinkClass}
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}

            <span className="text-sm text-hijau-tua/70">
              Halaman {page} dari {totalPages}
            </span>

            {page < totalPages ? (
              <Link rel="next" href={`/berita?page=${page + 1}`} className={pageLinkClass}>
                Berikutnya →
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        )}
      </div>
    </section>
  )
}
