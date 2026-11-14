'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SurahMeta } from '@/lib/quran'
import { getAudioFullUrl, getBackupAudioFullUrl, POPULAR_SURAHS } from '@/lib/quran'
import { getSingletonQuranAudio } from '@/lib/quran-audio'

interface QuranMurottalSectionProps {
  surahs: SurahMeta[]
}

type FilterTab = 'semua' | 'populer' | 'juz30' | 'mekah' | 'madinah'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function QuranMurottalSection({ surahs }: QuranMurottalSectionProps) {
  // Surah aktif yang sedang diputar (default: Surah Al-Fatihah / nomor 1)
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta>(
    () => surahs[0] ?? {
      nomor: 1,
      nama: 'الفاتحة',
      namaLatin: 'Al-Fatihah',
      jumlahAyat: 7,
      tempatTurun: 'Mekah',
      arti: 'Pembukaan',
      audioFull: 'https://cdn.equran.id/audio-full/Misyari-Rasyid-Al-Afasi/001.mp3',
    },
  )

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [autoPlayNext, setAutoPlayNext] = useState(true)
  const [isLoop, setIsLoop] = useState(false)
  const [speed, setSpeed] = useState<number>(1)

  // Playlist search & filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('semua')

  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const playlistContainerRef = useRef<HTMLDivElement | null>(null)

  // Filter daftar surah sesuai search query dan tab aktif
  const filteredSurahs = useMemo(() => {
    let result = surahs

    if (activeTab === 'populer') {
      result = result.filter((s) => POPULAR_SURAHS.includes(s.nomor))
    } else if (activeTab === 'juz30') {
      result = result.filter((s) => s.nomor >= 78 && s.nomor <= 114)
    } else if (activeTab === 'mekah') {
      result = result.filter((s) => s.tempatTurun.toLowerCase() === 'mekah')
    } else if (activeTab === 'madinah') {
      result = result.filter((s) => s.tempatTurun.toLowerCase() === 'madinah')
    }

    const q = searchQuery.trim().toLowerCase()
    if (!q) return result

    return result.filter(
      (s) =>
        s.namaLatin.toLowerCase().includes(q) ||
        s.arti.toLowerCase().includes(q) ||
        s.nama.includes(q) ||
        String(s.nomor) === q ||
        String(s.nomor).startsWith(q),
    )
  }, [surahs, activeTab, searchQuery])

  // Muat audio saat surah dipilih dan putar bila diinginkan
  const playSurah = useCallback(
    (surah: SurahMeta, autoStart = true) => {
      setSelectedSurah(surah)
      const audio = getSingletonQuranAudio()
      if (!audio) return

      const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
      setIsLoading(true)
      setCurrentTime(0)

      audio.src = primaryUrl
      audio.playbackRate = speed
      audio.volume = isMuted ? 0 : volume
      audio.load()

      if (autoStart) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('[QuranPlayer] Gagal memutar audio:', err)
            setIsPlaying(false)
          })
          .finally(() => setIsLoading(false))
      }
    },
    [isMuted, speed, volume],
  )

  // Inisialisasi & sinkronisasi audio HTML5 via singleton
  useEffect(() => {
    const audio = getSingletonQuranAudio()
    if (!audio) return

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
      setIsLoading(false)
    }

    const onPlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
    }

    const onPause = () => {
      setIsPlaying(false)
    }

    const onWaiting = () => {
      setIsLoading(true)
    }

    const onEnded = () => {
      if (isLoop) {
        audio.currentTime = 0
        void audio.play()
        return
      }

      if (autoPlayNext) {
        // Cari index surah saat ini di daftar surah
        const curIdx = surahs.findIndex((s) => s.nomor === selectedSurah.nomor)
        const nextSurah = surahs[curIdx + 1] || surahs[0]
        if (nextSurah) {
          playSurah(nextSurah)
        }
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    const onError = () => {
      // Fallback ke audio cadangan jika CDN utama gagal
      const backup = getBackupAudioFullUrl(selectedSurah.nomor)
      if (audio.src !== backup) {
        console.warn(
          `[QuranPlayer] CDN utama gagal, mencoba backup: ${backup}`,
        )
        audio.src = backup
        audio.load()
        void audio.play().catch(() => {})
      } else {
        setIsLoading(false)
        setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [selectedSurah, isLoop, autoPlayNext, surahs, playSurah])

  const togglePlayPause = () => {
    const audio = getSingletonQuranAudio()
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      if (!audio.src || !audio.src.startsWith('http')) {
        playSurah(selectedSurah, true)
      } else {
        setIsLoading(true)
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false))
          .finally(() => setIsLoading(false))
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    setCurrentTime(time)
    const audio = getSingletonQuranAudio()
    if (audio) {
      audio.currentTime = time
    }
  }

  const skipTime = (offset: number) => {
    const audio = getSingletonQuranAudio()
    if (!audio) return
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + offset))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const playPrevious = () => {
    const idx = surahs.findIndex((s) => s.nomor === selectedSurah.nomor)
    const prev = idx > 0 ? surahs[idx - 1] : surahs[surahs.length - 1]
    if (prev) playSurah(prev, isPlaying)
  }

  const playNext = () => {
    const idx = surahs.findIndex((s) => s.nomor === selectedSurah.nomor)
    const next = idx < surahs.length - 1 ? surahs[idx + 1] : surahs[0]
    if (next) playSurah(next, isPlaying)
  }

  const toggleMute = () => {
    const audio = getSingletonQuranAudio()
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (audio) {
      audio.muted = nextMuted
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    const audio = getSingletonQuranAudio()
    if (audio) {
      audio.volume = v
      audio.muted = v === 0
    }
  }

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    const audio = getSingletonQuranAudio()
    if (audio) {
      audio.playbackRate = newSpeed
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section
      id="murottal"
      aria-labelledby="murottal-heading"
      className="relative overflow-hidden bg-gradient-to-b from-krem via-white to-krem-tua/50 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* Header Seksi */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emas/40 bg-emas/10 px-4 py-1.5 text-xs font-semibold text-emas-tua shadow-xs">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>Lantunan Ayat Suci Al-Qur&apos;an</span>
          </div>

          <h2
            id="murottal-heading"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-hijau sm:text-4xl lg:text-5xl"
          >
            Murottal Al-Qur&apos;an 30 Juz
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-hijau-tua/75 leading-relaxed">
            Dengarkan lantunan merdu 114 surah Al-Qur&apos;an lengkap oleh Syaikh
            Misyari Rasyid Al-Afasi dengan pemutar audio jernih dan playlist
            interaktif yang terhubung langsung ke mushaf digital.
          </p>
        </div>

        {/* Kontainer Utama Terbagi 2: Kolom Kiri Player & Kolom Kanan Playlist */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* ======================================================== */}
          {/* KOLOM 1: PLAYER UTAMA (5 Kolom)                          */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-emas/40 bg-gradient-to-br from-hijau via-[#0F4C3A] to-[#092B21] p-4 sm:p-6 lg:p-8 text-krem shadow-2xl">
              {/* Ornamen Latar Kubah */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-10"
                aria-hidden="true"
              >
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M50 5 Q50 50 95 50 Q50 50 50 95 Q50 50 5 50 Q50 50 50 5" />
                </svg>
              </div>

              {/* Header Player: Badges */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emas px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-hijau shadow-xs">
                      Surah #{selectedSurah.nomor}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-krem/90">
                      {selectedSurah.tempatTurun}
                    </span>
                  </div>

                  <span className="text-[11px] sm:text-xs font-medium text-emas-muda">
                    {selectedSurah.jumlahAyat} Ayat
                  </span>
                </div>

                {/* Teks Arab Kaligrafi & Info Surah */}
                <div className="my-3 sm:my-6 text-center">
                  <p
                    dir="rtl"
                    lang="ar"
                    className="font-arabic text-3xl sm:text-4xl lg:text-5xl text-emas-muda drop-shadow-sm select-none py-0.5 sm:py-1"
                  >
                    {selectedSurah.nama}
                  </p>
                  <h3 className="mt-2 sm:mt-3 font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wide">
                    {selectedSurah.namaLatin}
                  </h3>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-krem/80 italic">
                    &ldquo;{selectedSurah.arti}&rdquo;
                  </p>

                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 rounded-full border border-emas/30 bg-white/5 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs text-krem/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-emas animate-pulse" />
                    <span>Qari: Syaikh Misyari Rasyid Al-Afasi</span>
                  </div>
                </div>
              </div>

              {/* Kontrol Audio: Progress Bar & Tombol */}
              <div className="space-y-4 sm:space-y-5 pt-1 sm:pt-2">
                {/* Progress Bar Interaktif */}
                <div>
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      aria-label="Progres durasi audio murottal"
                      className="h-1.5 sm:h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-emas focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #D4AF37 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] font-mono text-krem/75">
                    <span>{formatTime(currentTime)}</span>
                    <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
                  </div>
                </div>

                {/* Baris Tombol Playback Utama */}
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  {/* Surah Sebelumnya */}
                  <button
                    type="button"
                    onClick={playPrevious}
                    title="Surah Sebelumnya"
                    aria-label="Surah Sebelumnya"
                    className="rounded-full p-1.5 sm:p-2 text-krem/85 transition hover:bg-white/10 hover:text-emas active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="19 20 9 12 19 4 19 20" />
                      <line x1="5" y1="19" x2="5" y2="5" />
                    </svg>
                  </button>

                  {/* Mundur 10 Detik */}
                  <button
                    type="button"
                    onClick={() => skipTime(-10)}
                    title="Mundur 10 Detik"
                    aria-label="Mundur 10 Detik"
                    className="rounded-full p-1.5 sm:p-2 text-krem/85 transition hover:bg-white/10 hover:text-emas active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                    </svg>
                  </button>

                  {/* Tombol Play / Pause Utama */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Jeda Murottal' : 'Putar Murottal'}
                    className="relative flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emas via-emas-muda to-emas text-hijau shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emas/50"
                  >
                    {isLoading ? (
                      <svg
                        className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-hijau"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                    ) : isPlaying ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-hijau"
                        fill="currentColor"
                      >
                        <rect x="6" y="4" width="4" height="16" rx="1.5" />
                        <rect x="14" y="4" width="4" height="16" rx="1.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="ml-0.5 h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-hijau"
                        fill="currentColor"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>

                  {/* Maju 10 Detik */}
                  <button
                    type="button"
                    onClick={() => skipTime(10)}
                    title="Maju 10 Detik"
                    aria-label="Maju 10 Detik"
                    className="rounded-full p-1.5 sm:p-2 text-krem/85 transition hover:bg-white/10 hover:text-emas active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                    </svg>
                  </button>

                  {/* Surah Selanjutnya */}
                  <button
                    type="button"
                    onClick={playNext}
                    title="Surah Selanjutnya"
                    aria-label="Surah Selanjutnya"
                    className="rounded-full p-1.5 sm:p-2 text-krem/85 transition hover:bg-white/10 hover:text-emas active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" />
                    </svg>
                  </button>
                </div>

                {/* Kontrol Tambahan: Volume, Kecepatan, Repeat, Autoplay (Rapi & Seimbang di Mobile) */}
                <div className="border-t border-white/10 pt-3 sm:pt-4 text-xs text-krem/80 space-y-2.5">
                  {/* Baris 1: Volume & Kecepatan */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={toggleMute}
                        title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
                        className="rounded p-1 hover:text-emas shrink-0"
                      >
                        {isMuted || volume === 0 ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume audio murottal"
                        className="h-1.5 w-14 sm:w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-emas"
                      />
                    </div>

                    {/* Kecepatan Putar */}
                    <div className="flex items-center rounded-lg bg-white/10 p-0.5 shrink-0">
                      {[1, 1.25, 1.5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSpeedChange(s)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                            speed === s
                              ? 'bg-emas text-hijau shadow-xs'
                              : 'text-krem/75 hover:text-white'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Baris 2: Loop & Auto-Next Seimbang Rata (50-50 di Mobile, Flex di Desktop) */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                    {/* Loop Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsLoop(!isLoop)}
                      title={isLoop ? 'Ulangi Surah: Aktif' : 'Ulangi Surah: Nonaktif'}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        isLoop
                          ? 'bg-emas text-hijau font-bold shadow-xs'
                          : 'bg-white/10 text-krem/75 hover:bg-white/15'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      <span>{isLoop ? 'Ulang: ON' : 'Ulang: OFF'}</span>
                    </button>

                    {/* Auto-next Toggle */}
                    <button
                      type="button"
                      onClick={() => setAutoPlayNext(!autoPlayNext)}
                      title={autoPlayNext ? 'Lanjut Otomatis: Aktif' : 'Lanjut Otomatis: Nonaktif'}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        autoPlayNext
                          ? 'bg-emas/20 text-emas border border-emas/40 font-bold'
                          : 'bg-white/10 text-krem/75 hover:bg-white/15'
                      }`}
                    >
                      <span className="text-[10px]">⏭</span>
                      <span>{autoPlayNext ? 'Auto: ON' : 'Auto: OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Tombol Pintasan ke Halaman Baca Al-Qur'an Lengkap */}
                <div className="pt-1 sm:pt-2">
                  <Link
                    href={`/quran/${selectedSurah.nomor}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emas/60 bg-white/10 py-2 sm:py-2.5 text-xs font-semibold text-emas-muda shadow-xs transition hover:bg-emas hover:text-hijau active:scale-[0.99]"
                  >
                    <span>Baca Teks Lengkap Surah {selectedSurah.namaLatin}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KOLOM 2: PLAYLIST SURAH (7 Kolom)                        */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-emas/30 bg-white p-4 sm:p-6 shadow-xl">
              {/* Header Playlist & Tab Kategori */}
              <div className="border-b border-emas/20 pb-3 sm:pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-hijau text-emas shadow-xs">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-hijau">
                        Playlist Surah Al-Qur&apos;an
                      </h3>
                      <p className="text-[11px] sm:text-xs text-hijau-tua/60">
                        {filteredSurahs.length} dari 114 surah tersedia
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/quran"
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emas-tua transition hover:text-hijau hover:underline"
                  >
                    <span>Buka Menu Al-Qur&apos;an</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>

                {/* Kolom Pencarian Cepat */}
                <div className="relative mt-3 sm:mt-4">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari surah (misal: Yasin, Al-Mulk, 36)..."
                    className="w-full rounded-xl border border-emas/30 bg-krem/40 py-2 sm:py-2.5 pl-9 sm:pl-10 pr-8 text-xs sm:text-sm text-hijau-tua placeholder-hijau-tua/40 transition focus:border-emas focus:bg-white focus:outline-none focus:ring-2 focus:ring-emas/30"
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-hijau-tua/50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2 text-hijau-tua/40 hover:text-hijau-tua text-xs"
                    >
                      <span className="sr-only">Hapus pencarian</span>
                      ✕
                    </button>
                  )}
                </div>

                {/* Tab Filter Kategori: Scrollable Horizontal Rata di Mobile */}
                <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:flex-wrap">
                  {(
                    [
                      { key: 'semua', label: 'Semua (114)' },
                      { key: 'populer', label: '⭐ Populer' },
                      { key: 'juz30', label: 'Juz \'Amma (78-114)' },
                      { key: 'mekah', label: 'Makkiyyah' },
                      { key: 'madinah', label: 'Madaniyyah' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition ${
                        activeTab === tab.key
                          ? 'bg-hijau text-emas shadow-xs font-semibold'
                          : 'bg-krem/70 text-hijau-tua/70 hover:bg-krem-tua hover:text-hijau'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daftar Scrollable Surah */}
              <div
                ref={playlistContainerRef}
                className="mt-2.5 sm:mt-3 flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-[340px] sm:max-h-[420px]"
                tabIndex={0}
                aria-label="Daftar putar surah"
              >
                {filteredSurahs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-hijau-tua/60">
                    Tidak ditemukan surah yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredSurahs.map((surah) => {
                    const isCurrent = surah.nomor === selectedSurah.nomor
                    const isCurrentlyPlaying = isCurrent && isPlaying

                    return (
                      <div
                        key={surah.nomor}
                        onClick={() => {
                          if (isCurrent) {
                            togglePlayPause()
                          } else {
                            playSurah(surah, true)
                          }
                        }}
                        className={`group flex items-center justify-between gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 transition-all cursor-pointer border ${
                          isCurrent
                            ? 'border-emas bg-gradient-to-r from-emerald-50 via-emas/10 to-emerald-50 shadow-xs'
                            : 'border-neutral-200/70 bg-white hover:border-emas/40 hover:bg-krem/40'
                        }`}
                      >
                        {/* Kiri: Nomor + Info Surah */}
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Badge Nomor atau Equalizer */}
                          <div
                            className={`grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl font-bold text-xs transition-colors ${
                              isCurrent
                                ? 'bg-hijau text-emas shadow-xs'
                                : 'bg-krem-tua text-hijau-tua/80 group-hover:bg-emas/20 group-hover:text-emas-tua'
                            }`}
                          >
                            {isCurrentlyPlaying ? (
                              <div className="flex items-end gap-0.5 h-3.5 w-3.5" aria-label="Sedang berputar">
                                <span className="w-1 bg-emas rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2" />
                                <span className="w-1 bg-emas rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3.5" />
                                <span className="w-1 bg-emas rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
                              </div>
                            ) : (
                              <span>{surah.nomor}</span>
                            )}
                          </div>

                          {/* Nama Latin & Arti */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className={`truncate text-xs sm:text-sm font-bold ${isCurrent ? 'text-hijau' : 'text-neutral-900 group-hover:text-hijau'}`}>
                                {surah.namaLatin}
                              </p>
                              {isCurrent && (
                                <span className="rounded-full bg-emas/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emas-tua shrink-0">
                                  {isCurrentlyPlaying ? 'Memutar' : 'Dipilih'}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[10px] sm:text-xs text-hijau-tua/60">
                              {surah.arti} • {surah.jumlahAyat} Ayat
                            </p>
                          </div>
                        </div>

                        {/* Kanan: Kaligrafi Arab & Aksi */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <p
                            dir="rtl"
                            lang="ar"
                            className="font-arabic text-lg sm:text-xl text-hijau-tua/90 group-hover:text-hijau leading-none"
                          >
                            {surah.nama}
                          </p>

                          {/* Tombol Play Kecil */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isCurrent) {
                                togglePlayPause()
                              } else {
                                playSurah(surah, true)
                              }
                            }}
                            aria-label={`Putar Surah ${surah.namaLatin}`}
                            className={`grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full transition ${
                              isCurrentlyPlaying
                                ? 'bg-hijau text-emas shadow-xs'
                                : 'bg-krem text-hijau-tua group-hover:bg-emas group-hover:text-hijau'
                            }`}
                          >
                            {isCurrentlyPlaying ? (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor">
                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                <rect x="14" y="5" width="4" height="14" rx="1" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            )}
                          </button>

                          {/* Tautan ke halaman detail baca */}
                          <Link
                            href={`/quran/${surah.nomor}`}
                            onClick={(e) => e.stopPropagation()}
                            title={`Baca Surah ${surah.namaLatin} lengkap`}
                            className="hidden sm:grid h-8 w-8 place-items-center rounded-full text-hijau-tua/40 hover:bg-krem-tua hover:text-hijau transition"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer Petunjuk Playlist */}
              <div className="mt-3 flex items-center justify-between border-t border-emas/15 pt-3 text-[11px] text-hijau-tua/60">
                <span>💡 Klik baris surah untuk langsung memutar murottal.</span>
                <Link
                  href="/quran"
                  className="font-semibold text-emas-tua hover:text-hijau hover:underline"
                >
                  Lihat 30 Juz Lengkap →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

