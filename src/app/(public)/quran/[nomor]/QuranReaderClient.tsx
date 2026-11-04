'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SurahDetail } from '@/lib/quran'
import {
  getAudioFullUrl,
  getBackupAudioFullUrl,
  getAyatAudioUrl,
  getBackupAyatAudioUrl,
} from '@/lib/quran'

interface QuranReaderClientProps {
  surah: SurahDetail
}

interface ActiveAudio {
  mode: 'full' | 'ayat'
  ayatNomor?: number
  title: string
  url: string
  backupUrl?: string
  isBackupTried?: boolean
}

export function QuranReaderClient({ surah }: QuranReaderClientProps) {
  // Pengaturan preferensi membaca (tersimpan di localStorage)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showLatin, setShowLatin] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [lastReadAyat, setLastReadAyat] = useState<number | null>(null)
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null)
  const [showTafsir, setShowTafsir] = useState(false)

  // State audio player
  const [activeAudio, setActiveAudio] = useState<ActiveAudio | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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

  // Cleanup audio saat unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

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

  // Menginisialisasi pemutaran audio dengan fallback otomatis
  const startAudioPlayback = useCallback((audioTarget: ActiveAudio) => {
    setAudioError(null)
    setIsLoadingAudio(true)
    setCurrentTime(0)
    setDuration(0)
    setActiveAudio(audioTarget)

    let audio = audioRef.current
    if (!audio) {
      audio = new Audio()
      audioRef.current = audio
    }

    // Reset listener lama
    audio.oncanplay = null
    audio.onplaying = null
    audio.onpause = null
    audio.onended = null
    audio.onerror = null
    audio.ontimeupdate = null
    audio.onloadedmetadata = null

    audio.src = audioTarget.url
    audio.load()

    audio.onloadedmetadata = () => {
      if (audio) {
        setDuration(audio.duration || 0)
      }
    }

    audio.oncanplay = () => {
      setIsLoadingAudio(false)
    }

    audio.onplaying = () => {
      setIsLoadingAudio(false)
      setIsPlaying(true)
    }

    audio.onpause = () => {
      setIsPlaying(false)
    }

    audio.onended = () => {
      setIsPlaying(false)
      setIsLoadingAudio(false)
      setCurrentTime(0)
    }

    audio.ontimeupdate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime || 0)
      }
    }

    audio.onerror = () => {
      // Coba fallback URL cadangan jika ada dan belum dicoba
      if (audioTarget.backupUrl && !audioTarget.isBackupTried) {
        const backupTarget: ActiveAudio = {
          ...audioTarget,
          url: audioTarget.backupUrl,
          isBackupTried: true,
        }
        setActiveAudio(backupTarget)
        if (audio) {
          audio.src = audioTarget.backupUrl
          audio.load()
          audio.play().catch(() => {
            setIsLoadingAudio(false)
            setIsPlaying(false)
            setAudioError('Gagal memuat audio murottal dari server cadangan.')
          })
        }
        return
      }

      setIsLoadingAudio(false)
      setIsPlaying(false)
      setAudioError('Tidak dapat memuat audio murottal. Periksa koneksi internet Anda.')
    }

    audio.play().catch((err: unknown) => {
      console.warn('[QuranAudio] Play error:', err)
      // Tangani autoplay restriction browser atau network error
      setIsLoadingAudio(false)
      setIsPlaying(false)
      // Coba fallback jika belum
      if (audioTarget.backupUrl && !audioTarget.isBackupTried) {
        startAudioPlayback({
          ...audioTarget,
          url: audioTarget.backupUrl,
          isBackupTried: true,
        })
      } else {
        setAudioError('Pemutaran audio dijeda oleh browser. Klik tombol Putar untuk memulai.')
      }
    })
  }, [])

  // Toggle pemutaran audio full surah
  function handleToggleFullSurahAudio() {
    if (activeAudio?.mode === 'full') {
      if (isPlaying) {
        audioRef.current?.pause()
      } else {
        audioRef.current?.play().catch(() => {
          // Retry
          const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
          const backupUrl = getBackupAudioFullUrl(surah.nomor)
          startAudioPlayback({
            mode: 'full',
            title: `Surah ${surah.namaLatin} (Lengkap)`,
            url: primaryUrl,
            backupUrl,
          })
        })
      }
      return
    }

    const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
    const backupUrl = getBackupAudioFullUrl(surah.nomor)

    startAudioPlayback({
      mode: 'full',
      title: `Surah ${surah.namaLatin} (Lengkap)`,
      url: primaryUrl,
      backupUrl,
    })
  }

  // Toggle pemutaran audio per ayat
  function handleToggleAyatAudio(ayatNomor: number, audioData?: Record<string, string>) {
    if (activeAudio?.mode === 'ayat' && activeAudio.ayatNomor === ayatNomor) {
      if (isPlaying) {
        audioRef.current?.pause()
      } else {
        audioRef.current?.play().catch(() => {
          const primaryUrl = getAyatAudioUrl(audioData, surah.nomor, ayatNomor)
          const backupUrl = getBackupAyatAudioUrl(surah.nomor, ayatNomor)
          startAudioPlayback({
            mode: 'ayat',
            ayatNomor,
            title: `QS. ${surah.namaLatin} : Ayat ${ayatNomor}`,
            url: primaryUrl,
            backupUrl,
          })
        })
      }
      return
    }

    const primaryUrl = getAyatAudioUrl(audioData, surah.nomor, ayatNomor)
    const backupUrl = getBackupAyatAudioUrl(surah.nomor, ayatNomor)

    startAudioPlayback({
      mode: 'ayat',
      ayatNomor,
      title: `QS. ${surah.namaLatin} : Ayat ${ayatNomor}`,
      url: primaryUrl,
      backupUrl,
    })
  }

  function handleStopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setIsLoadingAudio(false)
    setActiveAudio(null)
    setAudioError(null)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = Number(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Kelas ukuran font Arab
  const arabicSizeClass = {
    sm: 'text-2xl leading-[2.2]',
    md: 'text-3xl leading-[2.3]',
    lg: 'text-4xl leading-[2.5]',
    xl: 'text-5xl leading-[2.6]',
  }[fontSize]

  const showBismillah = surah.nomor !== 1 && surah.nomor !== 9
  const isFullPlaying = activeAudio?.mode === 'full' && isPlaying
  const isFullLoading = activeAudio?.mode === 'full' && isLoadingAudio

  return (
    <div className="space-y-6 pb-24">
      {/* Notifikasi Error Audio jika ada */}
      {audioError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{audioError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAudioError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

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
            <button
              type="button"
              onClick={handleToggleFullSurahAudio}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow transition ${
                isFullPlaying
                  ? 'bg-rose-600 text-white animate-pulse'
                  : isFullLoading
                    ? 'bg-amber-500 text-white'
                    : 'bg-emas text-hijau hover:bg-emas-muda'
              }`}
            >
              <span>
                {isFullLoading
                  ? '⏳ Menyiapkan Audio...'
                  : isFullPlaying
                    ? '⏸ Jeda Murottal Surah'
                    : activeAudio?.mode === 'full'
                      ? '▶ Lanjutkan Murottal Surah'
                      : '▶ Putar Murottal Surah'}
              </span>
              <span className="text-[10px] opacity-75 font-normal">(Syaikh Al-Afasy)</span>
            </button>
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
          const isCurrentAyatActive =
            activeAudio?.mode === 'ayat' && activeAudio.ayatNomor === item.nomorAyat
          const isAyatPlaying = isCurrentAyatActive && isPlaying
          const isAyatLoading = isCurrentAyatActive && isLoadingAudio

          return (
            <article
              key={item.nomorAyat}
              id={`ayat-${item.nomorAyat}`}
              className={`rounded-2xl border transition p-4 sm:p-6 ${
                isBookmarked
                  ? 'border-emas bg-gradient-to-r from-amber-50/70 to-white ring-2 ring-emas/60 shadow-md'
                  : isCurrentAyatActive
                    ? 'border-green-600 bg-green-50/40 shadow-md'
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
                  {isCurrentAyatActive && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-900 border border-green-300 animate-pulse">
                      🔊 Audio Aktif
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Audio Ayat */}
                  <button
                    type="button"
                    onClick={() => handleToggleAyatAudio(item.nomorAyat, item.audio)}
                    className={`flex h-8 items-center gap-1 px-2.5 rounded-full text-xs font-semibold border transition ${
                      isAyatPlaying
                        ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                        : isAyatLoading
                          ? 'bg-amber-500 text-white border-amber-500'
                          : isCurrentAyatActive
                            ? 'bg-green-700 text-white border-green-700'
                            : 'border-black/10 bg-neutral-50 text-neutral-600 hover:border-emas hover:bg-krem'
                    }`}
                    title="Dengarkan Murottal Ayat Ini"
                  >
                    <span>
                      {isAyatLoading ? '⏳' : isAyatPlaying ? '⏸' : '▶'}
                    </span>
                    <span className="hidden sm:inline">
                      {isAyatLoading
                        ? 'Memuat'
                        : isAyatPlaying
                          ? 'Jeda'
                          : isCurrentAyatActive
                            ? 'Lanjut'
                            : 'Audio'}
                    </span>
                  </button>

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

      {/* Sticky Mini Player Audio Mengambang di Bawah Layar */}
      {activeAudio && (
        <aside
          aria-label="Pemutar Murottal Audio"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-2xl border border-emas/50 bg-[#092b21]/95 text-krem backdrop-blur-md p-4 shadow-2xl transition animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emas/20 text-emas border border-emas/40">
                {isPlaying ? (
                  <span className="flex items-end gap-0.5 h-4">
                    <span className="w-1 bg-emas rounded-full animate-bounce h-4" />
                    <span className="w-1 bg-emas rounded-full animate-bounce h-2 delay-100" />
                    <span className="w-1 bg-emas rounded-full animate-bounce h-3 delay-200" />
                  </span>
                ) : (
                  <span>🎵</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-emas-muda uppercase tracking-wider truncate">
                  Murottal Syaikh Misyari Rasyid Al-Afasy
                </p>
                <h4 className="text-sm font-bold text-krem truncate">
                  {activeAudio.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Tombol Play/Pause */}
              <button
                type="button"
                onClick={
                  activeAudio.mode === 'full'
                    ? handleToggleFullSurahAudio
                    : () => handleToggleAyatAudio(activeAudio.ayatNomor || 1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-emas text-hijau hover:bg-emas-muda font-bold shadow-md transition"
                title={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
              >
                {isLoadingAudio ? '⏳' : isPlaying ? '⏸' : '▶'}
              </button>

              {/* Tombol Tutup / Stop */}
              <button
                type="button"
                onClick={handleStopAudio}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-krem/80 hover:bg-white/20 transition text-xs"
                title="Hentikan & Tutup Pemutar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Bar & Durasi */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[11px] font-mono text-krem/70 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!duration}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-emas"
            />
            <span className="text-[11px] font-mono text-krem/70 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </aside>
      )}
    </div>
  )
}
