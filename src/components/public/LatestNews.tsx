import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { ArticleCard, type ArticleCardData } from './ArticleCard'

export type NewsItem = ArticleCardData

export function LatestNews({ articles }: { articles: NewsItem[] }) {
  return (
    <section
      id="terbaru"
      aria-labelledby="terbaru-judul"
      className="bg-krem-tua/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <SectionHeading id="terbaru-judul">
              Berita, Artikel &amp; Kajian Islami
            </SectionHeading>
            <p className="mt-2 text-sm text-hijau-tua/75">
              Kajian keislaman, tadabbur ayat Al-Qur&apos;an, hadits shahih, dan agenda kegiatan Masjid An-nuur Arwana.
            </p>
          </div>
          {articles.length > 0 && (
            <Link
              href="/berita"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-hijau hover:text-emas-tua transition shrink-0"
            >
              <span>Lihat Semua Berita &amp; Artikel</span>
              <span>→</span>
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada artikel atau pengumuman</p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug} className="h-full">
                <ArticleCard article={article} showCategory />
              </li>
            ))}
          </ul>
        )}

        {articles.length > 0 && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/berita"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emas/40 bg-white px-6 py-2.5 text-sm font-semibold text-hijau shadow-xs transition hover:bg-emas hover:text-hijau-tua"
            >
              <span>Lihat Semua Berita &amp; Artikel</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
