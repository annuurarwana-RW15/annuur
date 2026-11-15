'use client'

import { useState } from 'react'
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

export function PengumumanSectionTabs({
  sectionTitle,
  sectionText,
  articles,
  kegiatanRutinList,
}: Props) {
  const [activeTab, setActiveTab] = useState<'jadwal' | 'berita'>('jadwal')

  const activeKegiatan = kegiatanRutinList.filter((k) => k.isActive)

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
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeKegiatan.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-emas/20 bg-white p-5 shadow-xs transition duration-200 hover:border-emas/50 hover:shadow-md"
                  >
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
                  </li>
                ))}
              </ul>

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

