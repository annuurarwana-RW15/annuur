'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SurahDetail } from '@/lib/quran'
import {
  getAudioFullUrl,
  getBackupAudioFullUrl,
  getAyatAudioUrl,
  getBackupAyatAudioUrl,
} from '@/lib/quran'
import { getSingletonQuranAudio, stopSingletonQuranAudio } from '@/lib/quran-audio'

interface QuranReaderClientProps {
  surah: SurahDetail
  initialAutoplay?: string
}

interface ActiveAudio {
  mode: 'full' | 'ayat'
  ayatNomor?: number
  title: string
  url: string
  backupUrl?: string
  isBackupTried?: boolean
}

export function QuranReaderClient({ surah, initialAutoplay }: QuranReaderClientProps) {
  const router = useRouter()

  // Pengaturan preferensi membaca (tersimpan di localStorage)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showLatin, setShowLatin] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [lastReadAyat, setLastReadAyat] = useState<number | null>(null)
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null)
  const [showTafsir, setShowTafsir] = useState(false)

  // Pengaturan Auto Scroll Membaca (Manual)
  const [isAutoScrollActive, setIsAutoScrollActive] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState<number>(1) // 0.5x, 1x, 1.5x, 2x, 3x

  // Pengaturan Auto Scroll Murottal (Audio-Sync)
  const [murottalAutoScroll, setMurottalAutoScroll] = useState(true)

  // State audio player (diinisialisasi dengan surah baru jika initialAutoplay aktif agar player tidak hide)
  const [activeAudio, setActiveAudio] = useState<ActiveAudio | null>(() => {
    if (initialAutoplay === 'full') {
      return {
        mode: 'full',
        title: `Surah ${surah.namaLatin} (Lengkap)`,
        url: getAudioFullUrl(surah.audioFull, surah.nomor),
        backupUrl: getBackupAudioFullUrl(surah.nomor),
      }
    }
    if (initialAutoplay?.startsWith('ayat-')) {
      const targetAyat = parseInt(initialAutoplay.replace('ayat-', ''), 10)
      if (!isNaN(targetAyat) && targetAyat >= 1 && targetAyat <= surah.jumlahAyat) {
        const item = surah.ayat.find((a) => a.nomorAyat === targetAyat)
        return {
          mode: 'ayat',
          ayatNomor: targetAyat,
          title: `QS. ${surah.namaLatin} : Ayat ${targetAyat}`,
          url: getAyatAudioUrl(item?.audio, surah.nomor, targetAyat),
          backupUrl: getBackupAyatAudioUrl(surah.nomor, targetAyat),
        }
      }
    }
    return null
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(Boolean(initialAutoplay))
  const [audioError, setAudioError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const activeAudioRef = useRef<ActiveAudio | null>(null)
  activeAudioRef.current = activeAudio
  const autoplayTriggeredRef = useRef(false)

  const autoScrollRafRef = useRef<number | null>(null)
  const lastScrollTimeRef = useRef<number | null>(null)
  const prevScrolledAyatRef = useRef<number | null>(null)
  const lastScrollTimestampRef = useRef<number>(0)

  // Scroll halus ke kartu ayat di layar dengan zona nyaman & pencegahan getar (anti-jitter)
  const scrollToAyat = useCallback((ayatNomor: number, force = false) => {
    if (typeof window === 'undefined') return

    const now = Date.now()
    if (!force && prevScrolledAyatRef.current === ayatNomor && now - lastScrollTimestampRef.current < 400) {
      return
    }
    prevScrolledAyatRef.current = ayatNomor
    lastScrollTimestampRef.current = now

    setTimeout(() => {
      const el = document.getElementById(`ayat-${ayatNomor}`)
      if (!el) return

      // Kompatibilitas pengujian Vitest / JSDOM mock
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // Browser nyata: evaluasi posisi agar tidak tertutup sticky toolbar atas atau floating player bawah
      try {
        const rect = el.getBoundingClientRect()
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight
        const topSafeZone = 120 // Margin di bawah sticky bar atas (~100-110px)
        const bottomSafeZone = viewportHeight - 140 // Margin di atas floating player bawah (~100-120px)

        const isComfortablyVisible = rect.top >= topSafeZone && rect.bottom <= bottomSafeZone

        if (!isComfortablyVisible) {
          const scrollTarget = window.scrollY + rect.top - topSafeZone - 12
          window.scrollTo({
            top: Math.max(0, scrollTarget),
            behavior: 'smooth',
          })
        }
      } catch {}
    }, 50)
  }, [])

  // Menghitung ayat yang sedang dibaca murottal secara real-time
  const activeMurottalAyat = useMemo(() => {
    if (!activeAudio) return null
    if (activeAudio.mode === 'ayat') {
      return activeAudio.ayatNomor || 1
    }
    if (activeAudio.mode === 'full') {
      if (!duration || duration <= 0 || currentTime <= 0) return 1

      // File murottal full surah dari qari diawali Basmalah pembuka
      // pada seluruh surah selain Al-Fatihah (nomor 1) dan At-Taubah (nomor 9).
      // Durasi Basmalah pembuka rata-rata adalah ~6.5 detik.
      const bismillahDuration = surah.nomor !== 1 && surah.nomor !== 9 ? 6.5 : 0

      // Jika masih dalam rentang Basmalah pembuka, ayat aktif tetap Ayat 1
      if (currentTime < bismillahDuration) {
        return 1
      }

      const effectiveTime = Math.max(0, currentTime - bismillahDuration)
      const effectiveDuration = Math.max(1, duration - bismillahDuration)

      // Hitung bobot per ayat secara proporsional berdasarkan:
      // 1. Bobot durasi dasar minimum (45 unit, mencegah ayat pendek melompat terlalu cepat)
      // 2. Teks Arab bersih (tashkeel/harakat dibersihkan agar tidak bias)
      // 3. Jumlah kata (tajwid & mad berkorelasi erat dengan kata)
      // 4. Jeda waqaf nafas antar ayat (rata-rata 1.5 - 2 detik per ayat)
      const ayatWeights = surah.ayat.map((a) => {
        const cleanArab = (a.teksArab || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
        const words = cleanArab.trim() ? cleanArab.trim().split(/\s+/).length : 4
        const weight = 45 + cleanArab.length * 0.6 + words * 1.5
        return { nomorAyat: a.nomorAyat, weight }
      })

      const totalWeight = ayatWeights.reduce((acc, item) => acc + item.weight, 0)
      let accumulated = 0
      const progressRatio = Math.min(Math.max(effectiveTime / effectiveDuration, 0), 0.999)

      for (const item of ayatWeights) {
        accumulated += item.weight
        if (progressRatio < accumulated / totalWeight) {
          return item.nomorAyat
        }
      }
      return surah.ayat[surah.ayat.length - 1]?.nomorAyat || 1
    }
    return null
  }, [activeAudio, currentTime, duration, surah.ayat, surah.nomor])

  // Auto-scroll halus otomatis menyesuaikan ayat yang sedang dibaca murottal
  useEffect(() => {
    if (!isPlaying || !murottalAutoScroll || !activeMurottalAyat) return

    if (prevScrolledAyatRef.current !== activeMurottalAyat) {
      prevScrolledAyatRef.current = activeMurottalAyat
      scrollToAyat(activeMurottalAyat)
    }
  }, [activeMurottalAyat, isPlaying, murottalAutoScroll, scrollToAyat])

  // Reset tracking scroll saat audio dijeda atau distop
  useEffect(() => {
    if (!isPlaying) {
      prevScrolledAyatRef.current = null
    }
  }, [isPlaying])

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

      const savedSpeed = localStorage.getItem('annuur_quran_scroll_speed')
      if (savedSpeed) {
        const parsedSpeed = parseFloat(savedSpeed)
        if (!isNaN(parsedSpeed) && parsedSpeed > 0) {
          setScrollSpeed(parsedSpeed)
        }
      }

      const savedMurottalAutoScroll = localStorage.getItem('annuur_quran_murottal_autoscroll')
      if (savedMurottalAutoScroll !== null) {
        setMurottalAutoScroll(savedMurottalAutoScroll === 'true')
      }

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

  // Hentikan pemutaran audio saat surah berganti jika bukan autoplay dari player
  useEffect(() => {
    if (initialAutoplay) return

    stopSingletonQuranAudio()
    setIsPlaying(false)
    setIsLoadingAudio(false)
    setActiveAudio(null)
    setAudioError(null)
    setCurrentTime(0)
    setDuration(0)
    prevScrolledAyatRef.current = null
  }, [surah.nomor, initialAutoplay])

  // Loop animasi Auto Scroll Membaca (Manual)
  useEffect(() => {
    if (!isAutoScrollActive) {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = null
      }
      lastScrollTimeRef.current = null
      return
    }

    // Kecepatan piksel per detik berdasarkan multiplier (1x = ~35px/s)
    const pixelsPerSecond = scrollSpeed * 35

    function step(timestamp: number) {
      if (!lastScrollTimeRef.current) {
        lastScrollTimeRef.current = timestamp
      }
      const deltaSeconds = (timestamp - lastScrollTimeRef.current) / 1000
      lastScrollTimeRef.current = timestamp

      const pixelsToScroll = deltaSeconds * pixelsPerSecond
      if (pixelsToScroll > 0) {
        window.scrollBy({ top: pixelsToScroll, behavior: 'auto' })
      }

      // Berhenti otomatis jika mencapai dasar halaman
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (window.scrollY >= maxScroll - 8) {
        setIsAutoScrollActive(false)
        return
      }

      autoScrollRafRef.current = requestAnimationFrame(step)
    }

    autoScrollRafRef.current = requestAnimationFrame(step)

    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = null
      }
      lastScrollTimeRef.current = null
    }
  }, [isAutoScrollActive, scrollSpeed])

  // Cleanup audio dan auto scroll saat unmount dan navigasi keluar
  useEffect(() => {
    function handlePageHide() {
      stopSingletonQuranAudio()
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
      }
    }
  }, [])

  function updateFontSize(size: 'sm' | 'md' | 'lg' | 'xl') {
    setFontSize(size)
    try {
      localStorage.setItem('annuur_quran_font_size', size)
    } catch {}
  }

  function updateScrollSpeed(speed: number) {
    setScrollSpeed(speed)
    try {
      localStorage.setItem('annuur_quran_scroll_speed', String(speed))
    } catch {}
  }

  function toggleAutoScroll() {
    setIsAutoScrollActive((prev) => !prev)
  }

  function toggleMurottalAutoScroll() {
    setMurottalAutoScroll((prev) => {
      const next = !prev
      try {
        localStorage.setItem('annuur_quran_murottal_autoscroll', String(next))
      } catch {}
      return next
    })
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

  // Menginisialisasi pemutaran audio dengan Singleton Audio tunggal
  const startAudioPlayback = useCallback(
    (audioTarget: ActiveAudio) => {
      setAudioError(null)
      setIsLoadingAudio(true)
      setCurrentTime(0)
      setDuration(0)
      setActiveAudio(audioTarget)

      const audio = getSingletonQuranAudio()
      if (!audio) {
        setIsLoadingAudio(false)
        return
      }

      // Hentikan audio sebelumnya secara mutlak
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {}

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
        setDuration(audio.duration || 0)
      }

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime || 0)
      }

      audio.oncanplay = () => {
        setIsLoadingAudio(false)
      }

      audio.onplaying = () => {
        setIsLoadingAudio(false)
        setIsPlaying(true)
        setIsAutoScrollActive(false)
      }

      audio.onpause = () => {
        setIsPlaying(false)
      }

      audio.onended = () => {
        // Otomatis lanjut ke ayat berikutnya jika sedang mode ayat
        const current = activeAudioRef.current
        if (current?.mode === 'ayat' && current.ayatNomor) {
          const nextAyat = current.ayatNomor + 1
          if (nextAyat <= surah.jumlahAyat) {
            handlePlayAyat(nextAyat, true)
            return
          } else if (surah.suratSelanjutnya) {
            // Lanjut ke ayat 1 surah berikutnya
            stopSingletonQuranAudio()
            router.push(`/quran/${surah.suratSelanjutnya.nomor}?autoplay=ayat-1`)
            return
          }
        }

        setIsPlaying(false)
        setIsLoadingAudio(false)
        setCurrentTime(0)
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
          audio.src = audioTarget.backupUrl
          audio.load()
          audio.play().catch(() => {
            setIsLoadingAudio(false)
            setIsPlaying(false)
            setAudioError('Gagal memuat audio murottal dari server cadangan.')
          })
          return
        }

        setIsLoadingAudio(false)
        setIsPlaying(false)
        setAudioError('Tidak dapat memuat audio murottal. Periksa koneksi internet Anda.')
      }

      audio.play().catch((err: unknown) => {
        console.warn('[QuranAudio] Play error:', err)
        setIsLoadingAudio(false)
        setIsPlaying(false)
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surah.jumlahAyat, surah.suratSelanjutnya, router],
  )

  // Memutar ayat tertentu dan otomatis scroll halaman ke ayat tersebut
  const handlePlayAyat = useCallback(
    (ayatNomor: number, shouldScroll = true) => {
      if (ayatNomor < 1 || ayatNomor > surah.jumlahAyat) return
      const item = surah.ayat.find((a) => a.nomorAyat === ayatNomor)
      const primaryUrl = getAyatAudioUrl(item?.audio, surah.nomor, ayatNomor)
      const backupUrl = getBackupAyatAudioUrl(surah.nomor, ayatNomor)

      startAudioPlayback({
        mode: 'ayat',
        ayatNomor,
        title: `QS. ${surah.namaLatin} : Ayat ${ayatNomor}`,
        url: primaryUrl,
        backupUrl,
      })

      if (shouldScroll && murottalAutoScroll) {
        scrollToAyat(ayatNomor)
      }
    },
    [surah, startAudioPlayback, scrollToAyat, murottalAutoScroll],
  )

  // Toggle pemutaran audio full surah (berbagi kontrol dengan pemutar utama)
  function handleToggleFullSurahAudio() {
    const audio = getSingletonQuranAudio()

    if (activeAudio?.mode === 'full') {
      if (isPlaying) {
        audio?.pause()
      } else {
        if (audio && audio.src && audio.src.includes('.mp3')) {
          audio.play().catch(() => {
            const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
            const backupUrl = getBackupAudioFullUrl(surah.nomor)
            startAudioPlayback({
              mode: 'full',
              title: `Surah ${surah.namaLatin} (Lengkap)`,
              url: primaryUrl,
              backupUrl,
            })
          })
        } else {
          const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
          const backupUrl = getBackupAudioFullUrl(surah.nomor)
          startAudioPlayback({
            mode: 'full',
            title: `Surah ${surah.namaLatin} (Lengkap)`,
            url: primaryUrl,
            backupUrl,
          })
        }
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
  function handleToggleAyatAudio(ayatNomor: number) {
    const audio = getSingletonQuranAudio()

    if (activeAudio?.mode === 'ayat' && activeAudio.ayatNomor === ayatNomor) {
      if (isPlaying) {
        audio?.pause()
      } else {
        audio?.play().catch(() => {
          handlePlayAyat(ayatNomor, true)
        })
      }
      return
    }

    handlePlayAyat(ayatNomor, true)
  }

  // Memulai pemutaran audio otomatis saat berpindah surah dari player (initialAutoplay)
  useEffect(() => {
    if (!initialAutoplay || autoplayTriggeredRef.current) return
    autoplayTriggeredRef.current = true

    if (initialAutoplay === 'full') {
      const primaryUrl = getAudioFullUrl(surah.audioFull, surah.nomor)
      const backupUrl = getBackupAudioFullUrl(surah.nomor)
      startAudioPlayback({
        mode: 'full',
        title: `Surah ${surah.namaLatin} (Lengkap)`,
        url: primaryUrl,
        backupUrl,
      })
    } else if (initialAutoplay.startsWith('ayat-')) {
      const targetAyat = parseInt(initialAutoplay.replace('ayat-', ''), 10)
      if (!isNaN(targetAyat) && targetAyat >= 1 && targetAyat <= surah.jumlahAyat) {
        handlePlayAyat(targetAyat, true)
      }
    }
  }, [initialAutoplay, surah, startAudioPlayback, handlePlayAyat])

  // Tombol Prev pada Audio Player Utama
  function handlePrevAudio() {
    if (!activeAudio) return

    if (activeAudio.mode === 'ayat') {
      const currentAyat = activeAudio.ayatNomor || 1
      if (currentAyat > 1) {
        // Pindah ke ayat sebelumnya & scroll
        handlePlayAyat(currentAyat - 1, true)
      } else if (surah.suratSebelumnya) {
        // Hentikan audio lama seketika sebelum navigasi
        stopSingletonQuranAudio()
        setIsLoadingAudio(true)
        router.push(
          `/quran/${surah.suratSebelumnya.nomor}?autoplay=ayat-${surah.suratSebelumnya.jumlahAyat}`,
        )
      }
      return
    }

    if (activeAudio.mode === 'full') {
      if (surah.suratSebelumnya) {
        // Hentikan audio lama seketika sebelum navigasi
        stopSingletonQuranAudio()
        setIsLoadingAudio(true)
        router.push(`/quran/${surah.suratSebelumnya.nomor}?autoplay=full`)
      }
    }
  }

  // Tombol Next pada Audio Player Utama
  function handleNextAudio() {
    if (!activeAudio) return

    if (activeAudio.mode === 'ayat') {
      const currentAyat = activeAudio.ayatNomor || 1
      if (currentAyat < surah.jumlahAyat) {
        // Pindah ke ayat selanjutnya & scroll
        handlePlayAyat(currentAyat + 1, true)
      } else if (surah.suratSelanjutnya) {
        // Hentikan audio lama seketika sebelum navigasi
        stopSingletonQuranAudio()
        setIsLoadingAudio(true)
        router.push(`/quran/${surah.suratSelanjutnya.nomor}?autoplay=ayat-1`)
      }
      return
    }

    if (activeAudio.mode === 'full') {
      if (surah.suratSelanjutnya) {
        // Hentikan audio lama seketika sebelum navigasi
        stopSingletonQuranAudio()
        setIsLoadingAudio(true)
        router.push(`/quran/${surah.suratSelanjutnya.nomor}?autoplay=full`)
      }
    }
  }

  function handleStopAudio() {
    stopSingletonQuranAudio()
    setIsPlaying(false)
    setIsLoadingAudio(false)
    setActiveAudio(null)
    setAudioError(null)
    setCurrentTime(0)
    setDuration(0)
    prevScrolledAyatRef.current = null
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = Number(e.target.value)
    setCurrentTime(newTime)
    const audio = getSingletonQuranAudio()
    if (audio) {
      audio.currentTime = newTime
    }
  }

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Evaluasi status tombol Prev & Next
  let canPrev = false
  let canNext = false
  let prevTitle = 'Sebelumnya'
  let nextTitle = 'Selanjutnya'

  if (activeAudio?.mode === 'ayat') {
    const currentAyat = activeAudio.ayatNomor || 1
    if (currentAyat > 1) {
      canPrev = true
      prevTitle = `Ayat Sebelumnya (${currentAyat - 1})`
    } else if (surah.suratSebelumnya) {
      canPrev = true
      prevTitle = `Surah Sebelumnya (${surah.suratSebelumnya.namaLatin})`
    } else {
      canPrev = false
      prevTitle = 'Awal surah'
    }

    if (currentAyat < surah.jumlahAyat) {
      canNext = true
      nextTitle = `Ayat Selanjutnya (${currentAyat + 1})`
    } else if (surah.suratSelanjutnya) {
      canNext = true
      nextTitle = `Surah Selanjutnya (${surah.suratSelanjutnya.namaLatin})`
    } else {
      canNext = false
      nextTitle = 'Akhir surah'
    }
  } else if (activeAudio?.mode === 'full') {
    canPrev = Boolean(surah.suratSebelumnya)
    canNext = Boolean(surah.suratSelanjutnya)
    prevTitle = surah.suratSebelumnya
      ? `Surah Sebelumnya (${surah.suratSebelumnya.namaLatin})`
      : 'Surah Pertama'
    nextTitle = surah.suratSelanjutnya
      ? `Surah Selanjutnya (${surah.suratSelanjutnya.namaLatin})`
      : 'Surah Terakhir'
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
    <div className="space-y-6 pb-28">
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

            {/* Tombol Audio Murottal: Mode Sinkron Tiap Ayat & Mode Full Surah */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:justify-end sm:items-center">
              <button
                type="button"
                onClick={() => handleToggleAyatAudio(1)}
                aria-label={
                  activeAudio?.mode === 'ayat' && isPlaying
                    ? 'Jeda Bacaan Ayat'
                    : activeAudio?.mode === 'ayat'
                      ? 'Lanjut Bacaan Ayat'
                      : 'Putar Sinkron Tiap Ayat'
                }
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow transition ${
                  activeAudio?.mode === 'ayat' && isPlaying
                    ? 'bg-emerald-600 text-white animate-pulse ring-2 ring-emerald-300'
                    : 'bg-emerald-900/90 text-krem hover:bg-emerald-800 border border-emerald-500/40'
                }`}
                title="Putar murottal ayat demi ayat secara berurutan dengan sinkronisasi 100% presisi"
              >
                <span className="truncate">
                  {activeAudio?.mode === 'ayat' && isPlaying
                    ? '⏸ Jeda Ayat'
                    : activeAudio?.mode === 'ayat'
                      ? '▶ Lanjut Ayat'
                      : '▶ Sinkron Ayat'}
                </span>
                <span className="hidden sm:inline rounded bg-emas/20 px-1.5 py-0.5 text-[10px] text-emas-muda font-bold shrink-0">
                  ★ Presisi
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullSurahAudio}
                aria-label={
                  isFullLoading
                    ? 'Menyiapkan Audio'
                    : isFullPlaying
                      ? 'Jeda Murottal Surah'
                      : activeAudio?.mode === 'full'
                        ? 'Lanjutkan Murottal Surah'
                        : 'Putar Murottal Surah'
                }
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow transition ${
                  isFullPlaying
                    ? 'bg-rose-600 text-white animate-pulse'
                    : isFullLoading
                      ? 'bg-amber-500 text-white'
                      : 'bg-emas text-hijau hover:bg-emas-muda'
                }`}
                title="Putar audio full satu surah utuh"
              >
                <span className="truncate">
                  {isFullLoading
                    ? '⏳ Loading...'
                    : isFullPlaying
                      ? '⏸ Jeda Surah'
                      : activeAudio?.mode === 'full'
                        ? '▶ Lanjut Surah'
                        : '▶ Full Surah'}
                </span>
                <span className="hidden sm:inline text-[10px] opacity-75 font-normal shrink-0">(Al-Afasy)</span>
              </button>
            </div>

            {/* Konfigurasi Mode Scroll Murottal (Auto Scroll vs Manual) */}
            <div className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-1.5 border border-emas/20 text-xs">
              <span className="text-[11px] text-krem/75 font-medium">Navigasi Layar:</span>
              <div className="flex items-center rounded-lg bg-black/30 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMurottalAutoScroll(true)
                    try {
                      localStorage.setItem('annuur_quran_murottal_autoscroll', 'true')
                    } catch {}
                  }}
                  className={`rounded px-2.5 py-0.5 text-[11px] font-semibold transition flex items-center gap-1 ${
                    murottalAutoScroll
                      ? 'bg-emas text-hijau font-bold shadow-xs'
                      : 'text-krem/70 hover:text-krem'
                  }`}
                  title="Auto Scroll: Layar otomatis bergeser mengikuti ayat yang dilantunkan murottal"
                >
                  <span>📜</span>
                  <span>Auto Scroll</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMurottalAutoScroll(false)
                    try {
                      localStorage.setItem('annuur_quran_murottal_autoscroll', 'false')
                    } catch {}
                  }}
                  className={`rounded px-2.5 py-0.5 text-[11px] font-semibold transition flex items-center gap-1 ${
                    !murottalAutoScroll
                      ? 'bg-white/20 text-krem font-bold shadow-xs'
                      : 'text-krem/70 hover:text-krem'
                  }`}
                  title="Manual Scroll: Layar tetap diam di tempat, Anda bebas scroll manual"
                >
                  <span>🖐️</span>
                  <span>Manual</span>
                </button>
              </div>
            </div>
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
          onClick={handleStopAudio}
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

          {/* Konfigurasi Mode Scroll Murottal (Otomatis vs Manual) */}
          <button
            type="button"
            onClick={toggleMurottalAutoScroll}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition flex items-center gap-1.5 ${
              murottalAutoScroll
                ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold'
                : 'border-black/10 bg-neutral-50 text-neutral-500'
            }`}
            title={
              murottalAutoScroll
                ? 'Scroll Murottal: OTOMATIS (Layar otomatis bergulir mengikuti ayat yang dibaca). Klik untuk ganti ke Manual.'
                : 'Scroll Murottal: MANUAL (Layar tetap diam, bebas Anda geser sendiri). Klik untuk ganti ke Otomatis.'
            }
          >
            <span>{murottalAutoScroll ? '📜' : '🖐️'}</span>
            <span>Murottal: {murottalAutoScroll ? 'Auto Scroll' : 'Manual'}</span>
          </button>

          {/* Toggle & Kontrol Kecepatan Auto Scroll Baca (Manual) */}
          <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={toggleAutoScroll}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 ${
                isAutoScrollActive
                  ? 'bg-emas text-hijau font-bold shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
              title={
                isAutoScrollActive
                  ? 'Auto Scroll sedang aktif. Klik untuk mematikan.'
                  : 'Mulai Auto Scroll membaca surah'
              }
            >
              <span>📜</span>
              <span>Auto Scroll: {isAutoScrollActive ? `${scrollSpeed}x` : 'OFF'}</span>
            </button>

            {isAutoScrollActive && (
              <div className="flex items-center gap-0.5 border-l border-black/10 pl-1">
                {([0.5, 1, 1.5, 2, 3] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => updateScrollSpeed(spd)}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition ${
                      scrollSpeed === spd
                        ? 'bg-green-900 text-white shadow-xs'
                        : 'text-neutral-500 hover:bg-neutral-200/60'
                    }`}
                    title={`Kecepatan ${spd}x`}
                  >
                    {spd}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsAutoScrollActive(false)}
                  className="rounded px-1.5 py-0.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  title="Matikan Auto Scroll (Set OFF)"
                  aria-label="Matikan Auto Scroll"
                >
                  OFF
                </button>
              </div>
            )}
          </div>
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
          const isMurottalActive = activeMurottalAyat === item.nomorAyat
          const isCurrentAyatDirectAudio =
            activeAudio?.mode === 'ayat' && activeAudio.ayatNomor === item.nomorAyat
          const isCurrentAyatActive = isCurrentAyatDirectAudio || isMurottalActive
          const isAyatPlaying = isCurrentAyatActive && isPlaying
          const isAyatLoading = isCurrentAyatDirectAudio && isLoadingAudio

          return (
            <article
              key={item.nomorAyat}
              id={`ayat-${item.nomorAyat}`}
              className={`rounded-2xl border transition-all duration-300 p-4 sm:p-6 ${
                isMurottalActive
                  ? 'border-emas bg-gradient-to-r from-emerald-100/90 via-amber-50/95 to-teal-50/90 ring-2 ring-emas/70 shadow-lg border-l-4 border-l-emas'
                  : isBookmarked
                    ? 'border-emas bg-gradient-to-r from-amber-50/70 to-white ring-2 ring-emas/60 shadow-md'
                    : 'border-black/10 bg-white hover:border-black/20 shadow-sm'
              }`}
            >
              {/* Bar Header Ayat (Nomor, Audio, Bookmark, Salin) */}
              <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-inner ${
                      isMurottalActive ? 'bg-emas text-hijau' : 'bg-hijau text-krem'
                    }`}
                  >
                    {item.nomorAyat}
                  </span>
                  {isMurottalActive && (
                    <span className="rounded-full bg-gradient-to-r from-emerald-700 via-hijau to-teal-700 px-3 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1.5 animate-pulse">
                      <span>🔊</span>
                      <span>{isPlaying ? 'Murottal Sedang Membaca' : 'Murottal Jeda'}</span>
                    </span>
                  )}
                  {isBookmarked && (
                    <span className="rounded-full bg-emas/20 px-2.5 py-0.5 text-[11px] font-bold text-emas-tua border border-emas/40">
                      🔖 Terakhir Dibaca
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Audio Ayat */}
                  <button
                    type="button"
                    onClick={() => handleToggleAyatAudio(item.nomorAyat)}
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
            onClick={handleStopAudio}
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
          onClick={handleStopAudio}
          className="rounded-full bg-hijau px-5 py-2.5 text-xs font-semibold text-krem shadow hover:bg-hijau-tua transition text-center"
        >
          Semua Daftar Surah
        </Link>

        {surah.suratSelanjutnya ? (
          <Link
            href={`/quran/${surah.suratSelanjutnya.nomor}`}
            onClick={handleStopAudio}
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

      {/* Sticky Mini Player Audio Mengambang di Bawah Layar (Pemutar Utama Tunggal) */}
      {activeAudio && (
        <aside
          aria-label="Pemutar Murottal Audio"
          className="fixed bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 z-50 mx-auto max-w-2xl rounded-2xl border border-emas/50 bg-[#092b21]/95 text-krem backdrop-blur-md p-2.5 sm:p-4 shadow-2xl transition animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-emas/20 text-emas border border-emas/40">
                {isPlaying ? (
                  <span className="flex items-end gap-0.5 h-3.5 sm:h-4">
                    <span className="w-0.5 sm:w-1 bg-emas rounded-full animate-bounce h-3.5 sm:h-4" />
                    <span className="w-0.5 sm:w-1 bg-emas rounded-full animate-bounce h-2 delay-100" />
                    <span className="w-0.5 sm:w-1 bg-emas rounded-full animate-bounce h-2.5 sm:h-3 delay-200" />
                  </span>
                ) : (
                  <span className="text-xs sm:text-base">🎵</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-emas-muda uppercase tracking-wider truncate">
                    Al-Afasy
                  </p>
                  {activeMurottalAyat && (
                    <span className="rounded bg-emas/20 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold text-emas-muda border border-emas/30 shrink-0">
                      Ayat {activeMurottalAyat}
                    </span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-krem truncate">
                  {activeAudio.title}
                </h4>
              </div>
            </div>

            {/* Kontrol Player: Auto Scroll Murottal, Prev, Play/Pause, Next, Tutup */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Tombol Toggle Auto Scroll Murottal */}
              <button
                type="button"
                onClick={toggleMurottalAutoScroll}
                className={`flex h-8 sm:h-9 items-center gap-1 px-2 sm:px-3 rounded-full text-[11px] sm:text-xs font-semibold transition ${
                  murottalAutoScroll
                    ? 'bg-emas/20 text-emas-muda border border-emas/40 shadow-xs'
                    : 'bg-white/10 text-krem/50 hover:bg-white/15'
                }`}
                title={
                  murottalAutoScroll
                    ? 'Scroll Murottal: AKTIF (Layar otomatis mengikuti ayat yang dibaca). Klik untuk ganti ke Manual.'
                    : 'Scroll Murottal: MANUAL (Layar diam, bebas Anda geser sendiri). Klik untuk aktifkan auto-scroll.'
                }
                aria-label="Toggle Auto Scroll Murottal"
              >
                <span>{murottalAutoScroll ? '📜' : '🖐️'}</span>
                <span className="hidden sm:inline">
                  Scroll: {murottalAutoScroll ? 'ON' : 'OFF'}
                </span>
                <span className="sm:hidden text-[10px]">
                  {murottalAutoScroll ? 'Auto' : 'Off'}
                </span>
              </button>

              {/* Tombol Prev */}
              <button
                type="button"
                onClick={handlePrevAudio}
                disabled={!canPrev}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm transition ${
                  canPrev
                    ? 'bg-white/10 text-krem hover:bg-white/20 active:scale-95'
                    : 'bg-white/5 text-krem/30 cursor-not-allowed'
                }`}
                title={prevTitle}
                aria-label={prevTitle}
              >
                ⏮
              </button>

              {/* Tombol Play/Pause */}
              <button
                type="button"
                onClick={
                  activeAudio.mode === 'full'
                    ? handleToggleFullSurahAudio
                    : () => handleToggleAyatAudio(activeAudio.ayatNomor || 1)
                }
                className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-emas text-hijau hover:bg-emas-muda font-bold shadow-md transition active:scale-95 text-sm sm:text-base"
                title={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
                aria-label={isPlaying ? 'Jeda Audio' : 'Putar Audio'}
              >
                {isLoadingAudio ? '⏳' : isPlaying ? '⏸' : '▶'}
              </button>

              {/* Tombol Next */}
              <button
                type="button"
                onClick={handleNextAudio}
                disabled={!canNext}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm transition ${
                  canNext
                    ? 'bg-white/10 text-krem hover:bg-white/20 active:scale-95'
                    : 'bg-white/5 text-krem/30 cursor-not-allowed'
                }`}
                title={nextTitle}
                aria-label={nextTitle}
              >
                ⏭
              </button>

              {/* Tombol Tutup / Stop */}
              <button
                type="button"
                onClick={handleStopAudio}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/10 text-krem/80 hover:bg-white/20 transition text-[10px] sm:text-xs"
                title="Hentikan & Tutup Pemutar"
                aria-label="Hentikan & Tutup Pemutar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Bar & Durasi */}
          <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-[11px] font-mono text-krem/70 w-8 sm:w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!duration}
              className="h-1 sm:h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-emas"
            />
            <span className="text-[10px] sm:text-[11px] font-mono text-krem/70 w-8 sm:w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </aside>
      )}

      {/* Floating Controller Widget untuk Auto Scroll Membaca (Manual) */}
      {isAutoScrollActive && (
        <aside
          aria-label="Kontrol Kecepatan Auto Scroll"
          className={`fixed right-4 z-40 flex items-center gap-2 rounded-2xl border border-emas/50 bg-[#092b21]/95 px-3.5 py-2 text-krem shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
            activeAudio ? 'bottom-28' : 'bottom-6'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-emas-muda">
            <span className="animate-bounce">📜</span>
            <span className="hidden sm:inline">Auto Scroll:</span>
          </div>

          <div className="flex items-center gap-1">
            {([0.5, 1, 1.5, 2, 3] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => updateScrollSpeed(spd)}
                className={`rounded-lg px-2 py-0.5 text-xs font-bold transition ${
                  scrollSpeed === spd
                    ? 'bg-emas text-hijau shadow-sm'
                    : 'bg-white/10 text-krem/80 hover:bg-white/20'
                }`}
                title={`Atur Kecepatan ${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAutoScrollActive(false)}
            className="ml-1 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white px-2.5 py-0.5 text-xs font-bold transition shadow-xs"
            title="Matikan Auto Scroll (Set OFF)"
            aria-label="Matikan Auto Scroll"
          >
            OFF
          </button>
        </aside>
      )}
    </div>
  )
}
