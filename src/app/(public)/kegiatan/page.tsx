import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { ArticleCard } from '@/components/public/ArticleCard'
import { SectionHeading } from '@/components/public/SectionHeading'
import { getKegiatanRutinList } from '@/lib/kegiatan-rutin-server'
import { KegiatanRutinView } from '@/components/public/KegiatanRutinView'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Kegiatan & Agenda Rutin',
  description: 'Jadwal kajian rutin, majelis taklim, TPQ, dan dokumentasi kegiatan Masjid An-nuur Arwana.',
}

const LATEST = 12

export default async function KegiatanPage() {
  const [kegiatanRutinList, articles] = await Promise.all([
    getKegiatanRutinList(),
    db.article.findMany({
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
    }),
  ])

  return (
    <div className="bg-krem min-h-screen">
      {/* 1. SECTION AGENDA KEGIATAN RUTIN */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-8">
        <div className="max-w-3xl">
          <SectionHeading as="h1">Agenda Kegiatan Rutin</SectionHeading>
          <p className="mt-3 text-base leading-relaxed text-hijau-tua/80">
            Jadwal kajian keislaman, bimbingan Al-Qur&apos;an, majelis taklim, dan kegiatan pembinaan
            jamaah yang diselenggarakan secara berulang di Masjid An-nuur Arwana.
          </p>
        </div>

        <div className="mt-8">
          <KegiatanRutinView items={kegiatanRutinList} />
        </div>
      </section>

      {/* 2. SECTION DOKUMENTASI & BERITA KEGIATAN */}
      <section className="border-t border-emas/20 bg-white/70 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emas-tua">
              Dokumentasi &amp; Warta
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-hijau sm:text-4xl">
              Berita Kegiatan Terbaru
            </h2>
            <p className="mt-3 text-base leading-relaxed text-hijau-tua/80">
              Dokumentasi pelaksanaan program, kegiatan sosial, pengumuman penting, dan kabar seputar
              kemakmuran Masjid An-nuur Arwana.
            </p>
          </div>

          {articles.length === 0 ? (
            <p className="mt-8 text-hijau-tua/70">Belum ada dokumentasi kegiatan</p>
          ) : (
            <>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <li key={article.slug} className="h-full">
                    <ArticleCard article={article} showCategory />
                  </li>
                ))}
              </ul>
              {articles.length === LATEST && (
                <p className="mt-6 text-sm text-hijau-tua/70">
                  Menampilkan {LATEST} berita kegiatan terbaru.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
