import Link from 'next/link'
import { formatDateID } from '@/lib/format'
import { SectionHeading } from './SectionHeading'

export interface NewsItem {
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: Date | null
}

export function LatestNews({ articles }: { articles: NewsItem[] }) {
  return (
    <section
      id="terbaru"
      aria-labelledby="terbaru-judul"
      className="bg-krem-tua/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="terbaru-judul">
          Kegiatan &amp; Pengumuman Terbaru
        </SectionHeading>

        {articles.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada pengumuman</p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug} className="h-full">
                <Link
                  href={`/berita/${article.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-emas/25 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {article.coverImage && (
                    <span className="block aspect-[16/9] overflow-hidden bg-krem-tua">
                      {/* eslint-disable-next-line @next/next/no-img-element -- cover artikel dari penyimpanan eksternal, di luar image optimizer */}
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-5">
                    {article.publishedAt && (
                      <time
                        dateTime={article.publishedAt.toISOString()}
                        className="text-xs font-semibold text-emas-tua"
                      >
                        {formatDateID(article.publishedAt)}
                      </time>
                    )}
                    <span className="mt-2 font-display text-xl font-bold leading-snug text-hijau">
                      {article.title}
                    </span>
                    {article.excerpt && (
                      <span className="mt-2 text-sm leading-relaxed text-hijau-tua/75">
                        {article.excerpt}
                      </span>
                    )}
                    <span className="mt-auto pt-4 text-sm font-semibold text-emas-tua">
                      Baca selengkapnya →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
