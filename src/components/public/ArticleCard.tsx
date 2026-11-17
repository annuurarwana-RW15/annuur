import Link from 'next/link'
import { formatDateID } from '@/lib/format'
import { ShareButton } from './ShareButton'

export interface ArticleCardData {
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: Date | null
  category?: string | null
  authorName?: string | null
}

export function ArticleCard({
  article,
  showCategory = false,
}: {
  article: ArticleCardData
  showCategory?: boolean
}) {
  const badge =
    'inline-flex w-fit rounded-full border border-emas/40 bg-krem-tua px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emas-tua'

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-emas/25 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {article.coverImage && (
        <Link href={`/berita/${article.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-krem-tua">
          {/* eslint-disable-next-line @next/next/no-img-element -- cover artikel dari penyimpanan eksternal, di luar image optimizer */}
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          {showCategory && article.category ? (
            <span className={badge}>{article.category}</span>
          ) : (
            <span />
          )}

          <ShareButton
            title={article.title}
            text={article.excerpt || undefined}
            url={`/berita/${article.slug}`}
          />
        </div>

        {article.publishedAt && (
          <time
            dateTime={article.publishedAt.toISOString()}
            className="text-xs font-semibold text-emas-tua"
          >
            {formatDateID(article.publishedAt)}
          </time>
        )}
        {article.authorName && (
          <span className="mt-1 text-xs text-hijau-tua/60">
            Oleh {article.authorName}
          </span>
        )}
        <h3 className="mt-2 font-display text-xl font-bold leading-snug text-hijau">
          <Link href={`/berita/${article.slug}`} className="hover:underline">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && (
          <p className="mt-2 text-sm leading-relaxed text-hijau-tua/75 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <Link
            href={`/berita/${article.slug}`}
            className="text-sm font-semibold text-emas-tua hover:text-hijau transition"
          >
            Baca selengkapnya →
          </Link>
        </div>
      </div>
    </article>
  )
}
