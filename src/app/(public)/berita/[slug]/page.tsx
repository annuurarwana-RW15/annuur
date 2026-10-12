import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { formatDateID } from '@/lib/format'
import { articleLd, breadcrumbLd, buildMetadata, jsonLd } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { Markdown } from '@/components/public/Markdown'
import { ViewCounter } from '@/components/public/ViewCounter'

export const revalidate = 60

const DEFAULT_SITE_NAME = 'Masjid An-Nur Arwana'

interface ArtikelPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  })
  return articles.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: ArtikelPageProps): Promise<Metadata> {
  const { slug } = await params
  const [article, siteNameRaw] = await Promise.all([
    db.article.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        seoImage: true,
        coverImage: true,
        status: true,
      },
    }),
    getSetting('site.name', DEFAULT_SITE_NAME),
  ])
  if (!article || article.status !== 'PUBLISHED') return {}

  return buildMetadata({
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    image: article.seoImage || article.coverImage,
    path: `/berita/${slug}`,
    type: 'article',
    siteName: asText(siteNameRaw, DEFAULT_SITE_NAME),
  })
}

const breadcrumbItemClass = 'transition hover:text-hijau hover:underline'

export default async function ArtikelPage({ params }: ArtikelPageProps) {
  const { slug } = await params
  const [article, siteNameRaw] = await Promise.all([
    db.article.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    }),
    getSetting('site.name', DEFAULT_SITE_NAME),
  ])
  if (!article || article.status !== 'PUBLISHED') notFound()

  const siteName = asText(siteNameRaw, DEFAULT_SITE_NAME)
  const publishedAt = article.publishedAt ?? article.createdAt
  const breadcrumb = breadcrumbLd([
    { name: 'Beranda', url: '/' },
    { name: 'Berita', url: '/berita' },
    { name: article.title, url: `/berita/${article.slug}` },
  ])
  const articleJson = articleLd(
    {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      seoImage: article.seoImage,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    },
    article.author.name,
    siteName,
  )

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(articleJson) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }}
        />

        <nav aria-label="Breadcrumb" className="text-sm text-hijau-tua/70">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className={breadcrumbItemClass}>
                Beranda
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/berita" className={breadcrumbItemClass}>
                Berita
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-hijau-tua">
              {article.title}
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          {article.category && (
            <span className="mb-3 inline-flex w-fit rounded-full border border-emas/40 bg-krem-tua px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emas-tua">
              {article.category}
            </span>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight text-hijau sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hijau-tua/70">
            <time dateTime={publishedAt.toISOString()}>{formatDateID(publishedAt)}</time>
            <span aria-hidden="true">•</span>
            <span>Penulis: {article.author.name}</span>
          </p>
        </header>

        {article.coverImage && (
          /* eslint-disable-next-line @next/next/no-img-element -- cover artikel dari penyimpanan eksternal (R2), di luar image optimizer */
          <img
            src={article.coverImage}
            alt={article.title}
            className="mt-6 aspect-[16/9] w-full rounded-2xl border border-emas/20 object-cover"
          />
        )}

        <Markdown text={article.body} className="mt-8" />

        <ViewCounter slug={article.slug} />
      </div>
    </section>
  )
}
