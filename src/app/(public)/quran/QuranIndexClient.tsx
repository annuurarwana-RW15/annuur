'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { SurahMeta } from '@/lib/quran'
import { POPULAR_SURAHS } from '@/lib/quran'

interface LastRead {
  surahNomor: number
  surahName: string
  ayatNomor: number
}

export function QuranIndexClient({ surahs }: { surahs: SurahMeta[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'makkiyah' | 'madaniyah' | 'popular'>('all')
  const [lastRead, setLastRead] = useState<LastRead | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('annuur_quran_last_read')
      if (stored) {
        const parsed = JSON.parse(stored) as LastRead
        if (parsed.surahNomor && parsed.ayatNomor) {
          setLastRead(parsed)
        }
      }
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }
  }, [])

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return surahs.filter((s) => {
      // Filter kategori
      if (filter === 'makkiyah' && s.tempatTurun !== 'Mekah') return false
      if (filter === 'madaniyah' && s.tempatTurun !== 'Madinah') return false
      if (filter === 'popular' && !POPULAR_SURAHS.includes(s.nomor)) return false

      // Filter query pencarian
      if (!q) return true
      return (
        s.nomor.toString() === q ||
        s.namaLatin.toLowerCase().includes(q) ||
        s.nama.includes(q) ||
        s.arti.toLowerCase().includes(q)
      )
    })
  }, [surahs, query, filter])

  return (
    <div className="space-y-6">
      {/* Kartu Terakhir Dibaca */}
      {lastRead && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emas/40 bg-gradient-to-r from-hijau to-[#0c3c2e] p-4 sm:p-5 text-krem shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emas/20 text-emas text-lg border border-emas/40">
              🔖
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emas-muda">
                Terakhir Dibaca
              </p>
              <h3 className="font-display font-bold text-base sm:text-lg text-krem">
                Surah {lastRead.surahName} : Ayat {lastRead.ayatNomor}
              </h3>
            </div>
          </div>
          <Link
            href={`/quran/${lastRead.surahNomor}#ayat-${lastRead.ayatNomor}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emas px-4 py-2 text-xs font-semibold text-hijau shadow transition hover:bg-emas-muda"
          >
            <span>Lanjutkan Membaca</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {/* Bar Pencarian & Filter */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Input Pencarian */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama surah, nomor, atau arti..."
            className="w-full rounded-full border border-black/15 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-green-800 focus:outline-none focus:ring-2 focus:ring-green-800/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Filter */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-hijau text-krem shadow-sm'
                : 'border border-black/10 bg-white text-neutral-600 hover:border-emas hover:bg-krem/40'
            }`}
          >
            Semua (114)
          </button>
          <button
            type="button"
            onClick={() => setFilter('popular')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'popular'
                ? 'bg-hijau text-krem shadow-sm'
                : 'border border-black/10 bg-white text-neutral-600 hover:border-emas hover:bg-krem/40'
            }`}
          >
            Populer ⭐
          </button>
          <button
            type="button"
            onClick={() => setFilter('makkiyah')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'makkiyah'
                ? 'bg-hijau text-krem shadow-sm'
                : 'border border-black/10 bg-white text-neutral-600 hover:border-emas hover:bg-krem/40'
            }`}
          >
            Makkiyah
          </button>
          <button
            type="button"
            onClick={() => setFilter('madaniyah')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'madaniyah'
                ? 'bg-hijau text-krem shadow-sm'
                : 'border border-black/10 bg-white text-neutral-600 hover:border-emas hover:bg-krem/40'
            }`}
          >
            Madaniyah
          </button>
        </div>
      </div>

      {/* Grid Kartu Surah */}
      {filteredSurahs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
          <p className="text-neutral-500 text-sm">
            Tidak ditemukan surah dengan kata kunci &ldquo;{query}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setFilter('all')
            }}
            className="mt-3 text-xs font-semibold text-green-900 hover:underline"
          >
            Tampilkan semua surah
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSurahs.map((surah) => (
            <Link
              key={surah.nomor}
              href={`/quran/${surah.nomor}`}
              className="group relative flex items-center justify-between rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-emas hover:bg-gradient-to-r hover:from-white hover:to-krem/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Nomor Surah */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emas/40 bg-krem text-sm font-bold text-hijau shadow-inner group-hover:border-emas group-hover:bg-emas group-hover:text-hijau transition">
                  {surah.nomor}
                </span>

                {/* Nama & Info Surah */}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-neutral-900 group-hover:text-green-900 transition truncate">
                    {surah.namaLatin}
                  </h3>
                  <p className="text-xs text-neutral-500 truncate">
                    {surah.arti} &bull; {surah.jumlahAyat} ayat
                  </p>
                </div>
              </div>

              {/* Nama Arab & Badge */}
              <div className="text-right shrink-0 ps-2">
                <span className="font-arabic font-bold text-xl text-hijau group-hover:text-emas-tua transition">
                  {surah.nama}
                </span>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                  {surah.tempatTurun === 'Mekah' ? 'Makkiyah' : 'Madaniyah'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

