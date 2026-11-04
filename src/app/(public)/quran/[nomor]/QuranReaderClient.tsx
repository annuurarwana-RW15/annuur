'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { SurahDetail } from '@/lib/quran'

interface QuranReaderClientProps {
  surah: SurahDetail
}

export function QuranReaderClient({ surah }: QuranReaderClientProps) {
  // Pengaturan preferensi membaca (tersimpan di localStorage)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showLatin, setShowLatin] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [playingAyat, setPlayingAyat] = useState<number | null>(null)
  const [playingFull, setPlayingFull] = useState(false)
  const [lastReadAyat, setLastReadAyat] = useState<number | null>(null)
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null)
  const [showTafsir, setShowTafsir] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Baca preferensi dari localStorage
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem('annuur_quran_font_size') as
        | 'sm'
        | 'md'
        | 'lg'
        | 'xl'
        | null
      if (savedFontSize) setFontSize(savedFontSize)

      const savedShowLatin = localStorage.getItem('annuur_quran_show_latin')
      if (savedShowLatin !== null) setShowLatin(savedShowLatin === 'true')

      const savedShowTranslation = localStorage.getItem('annuur_quran_show_translation')
      if (savedShowTranslation !== null) setShowTranslation(savedShowTranslation === 'true')

      const last = localStorage.getItem('annuur_quran_last_read')
      if (last) {
        const parsed = JSON.parse(last) as { surahNomor: number; ayatNomor: number }
        if (parsed.surahNomor === surah.nomor) {
          setLastReadAyat(parsed.ayatNomor)
        }
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, [surah.nomor])

  function updateFontSize(size: 'sm' | 'md' | 'lg' | 'xl') {
    setFontSize(size)
    try {
      localStorage.setItem('annuur_quran_font_size', size)
    } catch {}
  }

  function toggleLatin() {
    setShowLatin((prev) => {
      const next = !prev
      try {
        localStorage.setItem('annuur_quran_show_latin', String(next))
      } catch {}
      return next
    })
  }

  function toggleTranslation() {
    setShowTranslation((prev) => {
      const next = !prev
      try {
        localStorage.setItem('annuur_quran_show_translation', String(next))
      } catch {}
      return next
    })
  }

  function markLastRead(ayatNomor: number) {
    setLastReadAyat(ayatNomor)
    try {
      localStorage.setItem(
        'annuur_quran_last_read',
        JSON.stringify({
          surahNomor: surah.nomor,
          surahName: surah.namaLatin,
          ayatNomor,
        }),
      )
    } catch {}
  }

  function copyAyat(ayatNomor: number, arab: string, latin: string, terjemahan: string) {
    const textToCopy = `${arab}\n\n${latin}\n\n"${terjemahan}"\n(QS. ${surah.namaLatin} [${surah.nomor}]: ${ayatNomor})`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedAyat(ayatNomor)
      setTimeout(() => setCopiedAyat(null), 2500)
    })
  }

  function playAudio(url: string, ayatNomor?: number) {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    if (ayatNomor !== undefined && playingAyat === ayatNomor) {
      setPlayingAyat(null)
      return
    }

    if (ayatNomor === undefined && playingFull) {
      setPlayingFull(false)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio

    if (ayatNomor !== undefined) {
      setPlayingAyat(ayatNomor)
      setPlayingFull(false)
      audio.onended = () => setPlayingAyat(null)
      audio.onerror = () => setPlayingAyat(null)
    } else {
      setPlayingFull(true)
      setPlayingAyat(null)
      audio.onended = () => setPlayingFull(false)
      audio.onerror = () => setPlayingFull(false)
    }

    audio.play().catch(() => {
      setPlayingAyat(null)
      setPlayingFull(false)
    })
  }

  // Kelas ukuran font Arab
  const arabicSizeClass = {
    sm: 'text-2xl leading-[2.2]',
    md: 'text-3xl leading-[2.3]',
    lg: 'text-4xl leading-[2.5]',
    xl: 'text-5xl leading-[2.6]',
  }[fontSize]

  const showBismillah = surah.nomor !== 1 && surah.nomor !== 9

  return (
    <div className="space-y-6">
      {/* Header Surah Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emas/40 bg-gradient-to-br from-hijau to-[#093528] p-6 sm:p-8 text-krem shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emas/20 px-3 py-1 text-xs font-bold text-emas-muda border border-emas/30">
                Surah ke-{surah.nomor}
              </span>
              <span className="text-xs uppercase tracking-wider text-krem/70">
                {surah.tempatTurun === 'Mekah' ? 'Makkiyah' : 'Madaniyah'} &bull; {surah.jumlahAyat} Ayat
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-krem">
              {surah.namaLatin}
            </h1>
            <p className="mt-1 text-sm text-krem/80">
              Artinya: <span className="text-emas-muda font-medium">&ldquo;{surah.arti}&rdquo;</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <span className="font-arabic text-4xl sm:text-5xl font-bold text-emas-muda">
              {surah.nama}
            </span>

            {/* Tombol Audio Murottal Full Surah */}
            {surah.audioFull && (
              <button
                type="button"
                onClick={() => playAudio(surah.audioFull)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow transition ${
                  playingFull
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emas text-hijau hover:bg-emas-muda'
                }`}
              >
                <span>{playingFull ? '⏸ Jeda Murottal' : '▶ Putar Murottal Surah'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Deskripsi / Tafsir Ringkas */}
        {surah.deskripsi && (
          <div className="mt-6 border-t border-emas/20 pt-4">
            <button
              type="button"
              onClick={() => setShowTafsir((v) => !v)}
              className="text-xs font-semibold text-emas-muda hover:underline flex items-center gap-1.5"
            >
              <span>{showTafsir ? 'Tutup Info Surah ▲' : 'Baca Pengantar & Kandungan Surah ▼'}</span>
            </button>
            {showTafsir && (
              <div
                className="mt-3 text-xs leading-relaxed text-krem/85 bg-black/20 rounded-xl p-4 border border-emas/20 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: surah.deskripsi }}
              />
            )}
          </div>
        )}
      </div>

      {/* Toolbar Pengaturan Membaca (Sticky Bar) */}
      <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/95 backdrop-blur-md px-4 py-3 shadow-sm">
        <Link
          href="/quran"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-900 hover:text-green-700"
        >
          <span>← Daftar Surah</span>
        </Link>

        {/* Kontrol Ukuran Font & Tampilan */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilihan Ukuran Font Arab */}
          <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-neutral-50 p-1">
            <span className="px-1 text-[11px] font-bold text-neutral-500">Font:</span>
            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => updateFontSize(sz)}
                className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                  fontSize === sz
                    ? 'bg-green-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200/60'
                }`}
                title={`Ukuran Font ${sz.toUpperCase()}`}
              >
                {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : sz === 'lg' ? 'A+' : 'A++'}
              </button>
            ))}
          </div>

          {/* Toggle Latin */}
          <button
            type="button"
            onClick={toggleLatin}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
              showLatin
                ? 'border-green-800 bg-green-50 text-green-900'
                : 'border-black/10 bg-neutral-50 text-neutral-400'
            }`}
          >
            Latin {showLatin ? '✓' : '✕'}
          </button>

          {/* Toggle Terjemahan */}
          <button
            type="button"
            onClick={toggleTranslation}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
              showTranslation
                ? 'border-green-800 bg-green-50 text-green-900'
                : 'border-black/10 bg-neutral-50 text-neutral-400'
            }`}
          >
            Arti {showTranslation ? '✓' : '✕'}
          </button>
        </div>
      </div>

      {/* Kaligrafi Bismillah */}
      {showBismillah && (
        <div className="my-8 text-center">
          <div className="inline-block rounded-2xl border border-emas/30 bg-white px-8 py-5 shadow-sm">
            <p className="font-arabic text-3xl sm:text-4xl text-hijau leading-relaxed">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
            </p>
            <p className="mt-1 text-xs text-neutral-500 italic">
              Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
            </p>
          </div>
        </div>
      )}

      {/* Daftar Ayat Demi Ayat */}
      <div className="space-y-4">
        {surah.ayat.map((item) => {
          const isBookmarked = lastReadAyat === item.nomorAyat
          const isPlayingThis = playingAyat === item.nomorAyat
          const audioUrl = item.audio?.['05'] || Object.values(item.audio || {})[0]

          return (
            <article
              key={item.nomorAyat}
              id={`ayat-${item.nomorAyat}`}
              className={`rounded-2xl border transition p-4 sm:p-6 ${
                isBookmarked
                  ? 'border-emas bg-gradient-to-r from-amber-50/70 to-white ring-2 ring-emas/60 shadow-md'
                  : 'border-black/10 bg-white hover:border-black/20 shadow-sm'
              }`}
            >
              {/* Bar Header Ayat (Nomor, Audio, Bookmark, Salin) */}
              <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-hijau text-krem text-xs font-bold shadow-inner">
                    {item.nomorAyat}
                  </span>
                  {isBookmarked && (
                    <span className="rounded-full bg-emas/20 px-2.5 py-0.5 text-[11px] font-bold text-emas-tua border border-emas/40">
                      🔖 Terakhir Dibaca
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Audio Ayat */}
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() => playAudio(audioUrl, item.nomorAyat)}
                      className={`flex h-8 items-center gap-1 px-2.5 rounded-full text-xs font-semibold border transition ${
                        isPlayingThis
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'border-black/10 bg-neutral-50 text-neutral-600 hover:border-emas hover:bg-krem'
                      }`}
                      title="Dengarkan Murottal Ayat"
                    >
                      <span>{isPlayingThis ? '⏸' : '▶'}</span>
                      <span className="hidden sm:inline">Audio</span>
                    </button>
                  )}

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={() => markLastRead(item.nomorAyat)}
                    className={`flex h-8 items-center gap-1 px-2.5 rounded-full text-xs font-semibold border transition ${
                      isBookmarked
                        ? 'border-emas bg-emas text-hijau shadow-sm'
                        : 'border-black/10 bg-neutral-50 text-neutral-600 hover:border-emas hover:bg-krem'
                    }`}
                    title="Tandai Terakhir Dibaca"
                  >
                    <span>🔖</span>
                    <span className="hidden sm:inline">Tandai</span>
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() =>
                      copyAyat(
                        item.nomorAyat,
                        item.teksArab,
                        item.teksLatin,
                        item.teksIndonesia,
                      )
                    }
                    className="flex h-8 items-center gap-1 px-2.5 rounded-full text-xs font-semibold border border-black/10 bg-neutral-50 text-neutral-600 hover:border-emas hover:bg-krem transition"
                    title="Salin Ayat"
                  >
                    <span>{copiedAyat === item.nomorAyat ? '✓' : '📋'}</span>
                    <span className="hidden sm:inline">
                      {copiedAyat === item.nomorAyat ? 'Tersalin' : 'Salin'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Teks Arab Utsmani */}
              <div className="text-right my-4">
                <p
                  dir="rtl"
                  lang="ar"
                  className={`font-arabic text-neutral-900 ${arabicSizeClass} tracking-wide select-text`}
                >
                  {item.teksArab}
                </p>
              </div>

              {/* Transliterasi Latin */}
              {showLatin && item.teksLatin && (
                <div className="mt-3">
                  <p className="text-sm font-medium leading-relaxed text-green-900/90 italic">
                    {item.teksLatin}
                  </p>
                </div>
              )}

              {/* Terjemahan Bahasa Indonesia */}
              {showTranslation && item.teksIndonesia && (
                <div className="mt-2.5 border-t border-black/5 pt-2">
                  <p className="text-sm leading-relaxed text-neutral-700">
                    {item.teksIndonesia}
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Navigasi Surah Sebelumnya & Selanjutnya */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emas/30 bg-white p-5 shadow-sm">
        {surah.suratSebelumnya ? (
          <Link
            href={`/quran/${surah.suratSebelumnya.nomor}`}
            className="flex items-center gap-2 rounded-xl border border-black/10 p-3 hover:border-emas hover:bg-krem/40 transition w-full sm:w-auto"
          >
            <span className="text-lg">←</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                Surah Sebelumnya
              </p>
              <h4 className="text-sm font-semibold text-neutral-900">
                {surah.suratSebelumnya.namaLatin} ({surah.suratSebelumnya.nama})
              </h4>
            </div>
          </Link>
        ) : (
          <div />
        )}

        <Link
          href="/quran"
          className="rounded-full bg-hijau px-5 py-2.5 text-xs font-semibold text-krem shadow hover:bg-hijau-tua transition text-center"
        >
          Semua Daftar Surah
        </Link>

        {surah.suratSelanjutnya ? (
          <Link
            href={`/quran/${surah.suratSelanjutnya.nomor}`}
            className="flex items-center justify-end gap-2 rounded-xl border border-black/10 p-3 hover:border-emas hover:bg-krem/40 transition w-full sm:w-auto text-right"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                Surah Selanjutnya
              </p>
              <h4 className="text-sm font-semibold text-neutral-900">
                {surah.suratSelanjutnya.namaLatin} ({surah.suratSelanjutnya.nama})
              </h4>
            </div>
            <span className="text-lg">→</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}

