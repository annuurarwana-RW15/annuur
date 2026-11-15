'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  type KegiatanRutinItem,
  HARI_LABELS,
  KATEGORI_KEGIATAN_LABELS,
} from '@/lib/kegiatan-rutin'
import { ArticleCard, type ArticleCardData } from './ArticleCard'
import { SectionHeading } from './SectionHeading'

interface Props {
  sectionTitle: string
  sectionText: string
  articles: ArticleCardData[]
  kegiatanRutinList: KegiatanRutinItem[]
}

function KegiatanCard({ item }: { item: KegiatanRutinItem }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-emas/20 bg-white p-5 shadow-xs transition duration-200 hover:border-emas/50 hover:shadow-md">
      <div>
        {/* Badge Hari & Kategori */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
            {HARI_LABELS[item.hari]}
          </span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
            {KATEGORI_KEGIATAN_LABELS[item.kategori]}
          </span>
        </div>

        <h3 className="font-bold text-neutral-900 leading-snug text-base line-clamp-2">
          {item.nama}
        </h3>

        <dl className="mt-3.5 space-y-1.5 text-xs text-hijau-tua/90">
          <div className="flex items-start gap-2">
            <span className="text-emas-tua font-bold">⏰</span>
            <span className="font-semibold text-emerald-950">{item.waktu}</span>
          </div>
          {item.pemateri && (
            <div className="flex items-start gap-2">
              <span className="text-emas-tua font-bold">👤</span>
              <span className="font-semibold text-neutral-900">{item.pemateri}</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-neutral-600">
            <span className="text-emas-tua font-bold">📍</span>
            <span>{item.lokasi}</span>
          </div>
        </dl>

        {item.deskripsi && (
          <p className="mt-3.5 rounded-xl bg-krem/60 p-3 text-xs leading-relaxed text-hijau-tua/80 line-clamp-3">
            {item.deskripsi}
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3 text-right">
        <Link
          href="/kegiatan"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
        >
          Detail Jadwal →
        </Link>
      </div>
    </div>
  )
}

export function PengumumanSectionTabs({
  sectionTitle,
  sectionText,
  articles,
  kegiatanRutinList,
}: Props) {
  const [activeTab, setActiveTab] = useState<'jadwal' | 'berita'>('jadwal')

  // Mobile Slider State (1 card looping)
  const [mobileKegiatanIndex, setMobileKegiatanIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartXRef = useRef(0)

  const activeKegiatan = kegiatanRutinList.filter((k) => k.isActive)
  const displayedKegiatan = activeKegiatan.slice(0, 6)
  const totalCount = displayedKegiatan.length

  // Extended items untuk seamless looping (1 card pertama dikloning ke ujung track)
  const extendedKegiatan =
    totalCount > 1 ? [...displayedKegiatan, displayedKegiatan[0]] : displayedKegiatan

  const nextSlide = useCallback(() => {
    if (totalCount < 2) return
    setIsTransitioning(true)
    setMobileKegiatanIndex((prev) => prev + 1)
  }, [totalCount])

  const prevSlide = useCallback(() => {
    if (totalCount < 2) return
    setIsTransitioning(true)
    setMobileKegiatanIndex((prev) => (prev === 0 ? totalCount - 1 : prev - 1))
  }, [totalCount])

  const handleTransitionEnd = () => {
    if (mobileKegiatanIndex >= totalCount) {
      setIsTransitioning(false)
      setMobileKegiatanIndex(0)
    }
  }

  useEffect(() => {
    if (isPaused || totalCount < 2 || activeTab !== 'jadwal') return

    const timer = setInterval(() => {
      nextSlide()
    }, 3600)

    return () => clearInterval(timer)
  }, [isPaused, totalCount, activeTab, nextSlide])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    setIsPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const diff = touchStartXRef.current - endX
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    setTimeout(() => {
      setIsPaused(false)
    }, 1200)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      {/* Header and Section Description */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <SectionHeading id="pengumuman-judul">{sectionTitle}</SectionHeading>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-hijau-tua/80">
            {sectionText}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="inline-flex rounded-full border border-emas/30 bg-white/90 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'jadwal'
                ? 'bg-hijau text-emas shadow-xs'
                : 'text-hijau-tua/70 hover:text-hijau'
            }`}
          >
            <span>🗓️</span>
            <span>Jadwal Rutin ({activeKegiatan.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('berita')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'berita'
                ? 'bg-hijau text-emas shadow-xs'
                : 'text-hijau-tua/70 hover:text-hijau'
            }`}
          >
            <span>📢</span>
            <span>Pengumuman &amp; Berita ({articles.length})</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: JADWAL RUTIN PEKANAN */}
      {activeTab === 'jadwal' && (
        <div className="mt-8">
          {activeKegiatan.length === 0 ? (
            <p className="mt-8 text-hijau-tua/70">Jadwal kegiatan rutin sedang disiapkan.</p>
          ) : (
            <>
              {/* Tampilan Desktop View (Grid 2-3 Kolom) */}
              <ul className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedKegiatan.map((item) => (
                  <li key={item.id} className="h-full">
                    <KegiatanCard item={item} />
                  </li>
                ))}
              </ul>

              {/* Tampilan Mobile View: Auto Slide 1 Card & Looping */}
              <div
                className="sm:hidden relative w-full overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Indikator Status & Tombol Jeda di Mobile */}
                {totalCount > 1 && (
                  <div className="mb-3 flex items-center justify-between px-1 text-[11px] text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                        }`}
                      />
                      <span>{isPaused ? 'Jeda otomatis' : 'Auto Slide (1 Card)'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaused((prev) => !prev)}
                      className="rounded-full bg-white/90 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50"
                    >
                      {isPaused ? '▶ Putar' : '⏸ Jeda'}
                    </button>
                  </div>
                )}

                {/* Track Slider Mobile */}
                <div
                  className={`flex ${
                    isTransitioning ? 'transition-transform duration-500 ease-out' : ''
                  }`}
                  style={{ transform: `translateX(-${mobileKegiatanIndex * 100}%)` }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {extendedKegiatan.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="w-full shrink-0 px-0.5"
                    >
                      <KegiatanCard item={item} />
                    </div>
                  ))}
                </div>

                {/* Dots Indicator di Mobile */}
                {totalCount > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    {displayedKegiatan.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Lihat kegiatan ${i + 1}`}
                        onClick={() => {
                          setIsTransitioning(true)
                          setMobileKegiatanIndex(i)
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          mobileKegiatanIndex % totalCount === i
                            ? 'w-6 bg-emerald-800'
                            : 'w-1.5 bg-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/kegiatan"
                  className="inline-flex items-center gap-2 rounded-full border border-emas/50 bg-white px-6 py-2.5 text-sm font-semibold text-hijau shadow-xs transition hover:bg-emas hover:text-hijau-tua"
                >
                  <span>Lihat Seluruh Jadwal Agenda Rutin</span>
                  <span>→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: PENGUMUMAN & BERITA ARTIKEL */}
      {activeTab === 'berita' && (
        <div className="mt-8">
          {articles.length === 0 ? (
            <p className="mt-8 text-hijau-tua/70">Belum ada artikel atau pengumuman terbaru.</p>
          ) : (
            <>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <li key={article.slug} className="h-full">
                    <ArticleCard article={article} showCategory />
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/berita"
                  className="inline-flex items-center gap-2 rounded-full border border-emas/50 bg-white px-6 py-2.5 text-sm font-semibold text-hijau shadow-xs transition hover:bg-emas hover:text-hijau-tua"
                >
                  <span>Lihat Semua Berita &amp; Artikel</span>
                  <span>→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}


