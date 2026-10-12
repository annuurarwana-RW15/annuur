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
        <SectionHeading id="terbaru-judul">
          Kegiatan &amp; Pengumuman Terbaru
        </SectionHeading>

        {articles.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada pengumuman</p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug} className="h-full">
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
