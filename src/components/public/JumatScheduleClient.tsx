'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { JumatRow } from '@/app/admin/(dashboard)/sections/jumat-items'
import { formatDateID } from '@/lib/format'

const DAY_FORMAT = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })

function formatJumatDate(iso: string): { hari: string; tanggal: string } | null {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return { hari: DAY_FORMAT.format(date), tanggal: formatDateID(date) }
}

interface JumatScheduleClientProps {
  items: JumatRow[]
}

export function JumatScheduleClient({ items }: JumatScheduleClientProps) {
  const [mobileIndex, setMobileIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartXRef = useRef(0)

  // Batasi hingga 8 item mendatang agar performa dan siklus optimal
  const activeItems = items.slice(0, 8)
  const totalCount = activeItems.length

  // Siapkan track kloning untuk seamless looping (2 item pertama dikloning ke ujung kanan)
  const extendedItems =
    totalCount >= 2 ? [...activeItems, activeItems[0], activeItems[1]] : activeItems

  const nextSlide = useCallback(() => {
    if (totalCount < 2) return
    setIsTransitioning(true)
    setMobileIndex((prev) => prev + 1)
  }, [totalCount])

  const prevSlide = useCallback(() => {
    if (totalCount < 2) return
    setIsTransitioning(true)
    setMobileIndex((prev) => (prev === 0 ? totalCount - 1 : prev - 1))
  }, [totalCount])

  // Saat mencapai item kloning (indeks == totalCount), reset tanpa animasi ke indeks 0
  const handleTransitionEnd = () => {
    if (mobileIndex >= totalCount) {
      setIsTransitioning(false)
      setMobileIndex(0)
    }
  }

  // Timer auto-slide (tiap 3.8 detik meluncur halus ke kartu berikutnya)
  useEffect(() => {
    if (isPaused || totalCount < 2) return

    const timer = setInterval(() => {
      nextSlide()
    }, 3800)

    return () => clearInterval(timer)
  }, [isPaused, totalCount, nextSlide])

  // Gestur sentuh (touch swipe) untuk layar HP
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
    // Lanjutkan auto slide setelah jeda singkat
    setTimeout(() => {
      setIsPaused(false)
    }, 1200)
  }

  if (activeItems.length === 0) {
    return <p className="mt-6 text-hijau-tua/70">Jadwal khotib sedang disiapkan.</p>
  }

  return (
    <div className="mt-8">
      {/* 1. TAMPILAN DESKTOP & TABLET (≥ sm): Grid 2 atau 4 Kolom */}
      <ul className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {activeItems.slice(0, 4).map((item, index) => {
          const date = formatJumatDate(item.tanggal)
          const isNearest = index === 0

          return (
            <li
              key={`desktop-${item.tanggal}-${index}`}
              className={`relative flex flex-col justify-between rounded-2xl p-6 transition duration-300 shadow-xs hover:shadow-md ${
                isNearest
                  ? 'border-2 border-emas bg-gradient-to-b from-white to-emerald-50/50'
                  : 'border border-emas/25 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emas-tua">
                    {date ? date.hari : 'Jumat'}
                  </p>
                  {isNearest && (
                    <span className="rounded-full bg-emas px-2.5 py-0.5 text-[10px] font-bold text-hijau-tua uppercase tracking-wider">
                      Pekan Ini
                    </span>
                  )}
                </div>

                <p className="mt-2 font-display text-2xl font-bold text-hijau leading-tight">
                  {date ? date.tanggal : item.tanggal}
                </p>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="rounded-xl bg-neutral-50/80 p-3 border border-black/5">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-hijau-tua/60 flex items-center gap-1.5">
                      <span>🕌</span>
                      <span>Khotib</span>
                    </dt>
                    <dd className="mt-1 font-bold text-hijau-tua text-base leading-snug">
                      {item.khatib}
                    </dd>
                  </div>

                  {item.imam && (
                    <div className="rounded-xl bg-neutral-50/80 p-3 border border-black/5">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-hijau-tua/60 flex items-center gap-1.5">
                        <span>📖</span>
                        <span>Imam Sholat</span>
                      </dt>
                      <dd className="mt-1 font-semibold text-hijau-tua text-sm">
                        {item.imam}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="mt-5 border-t border-black/5 pt-3 text-[11px] text-hijau-tua/60 flex items-center justify-between">
                <span>Sholat Jumat</span>
                <span className="font-semibold text-emerald-800">12:00 WIB</span>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 2. TAMPILAN MOBILE (< sm): Auto Slide Smooth, 2 Card Tampak Sekaligus & Looping */}
      <div
        className="sm:hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Auto Slide (2 Jadwal)</span>
          </span>

          {totalCount >= 2 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Jadwal Jumat sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau shadow-2xs active:scale-90"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Jadwal Jumat berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau shadow-2xs active:scale-90"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Carousel Viewport: 2 Card per Viewport */}
        <div className="overflow-hidden rounded-2xl p-1 -m-1">
          <div
            onTransitionEnd={handleTransitionEnd}
            className={`flex gap-2.5 ${
              isTransitioning
                ? 'transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]'
                : 'transition-none'
            }`}
            style={{
              // Tiap langkah menggeser 1 kartu (50% dari kontainer + setengah gap)
              transform: `translateX(calc(-${mobileIndex} * (50% + 5px)))`,
            }}
          >
            {extendedItems.map((item, idx) => {
              const date = formatJumatDate(item.tanggal)
              // Indeks asli modulo totalCount
              const originalIndex = idx % totalCount
              const isNearest = originalIndex === 0

              return (
                <div
                  key={`mobile-khotib-${item.tanggal}-${idx}`}
                  className={`w-[calc(50%-5px)] shrink-0 flex flex-col justify-between rounded-2xl p-3.5 shadow-2xs transition-all ${
                    isNearest
                      ? 'border-2 border-emas bg-gradient-to-b from-white to-emerald-50/70 shadow-xs'
                      : 'border border-emas/30 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emas-tua truncate">
                        {date ? date.hari : 'Jumat'}
                      </p>
                      {isNearest && (
                        <span className="shrink-0 rounded-full bg-emas px-1.5 py-0.5 text-[9px] font-bold text-hijau-tua uppercase tracking-wide">
                          Pekan Ini
                        </span>
                      )}
                    </div>

                    <p className="mt-1 font-display text-base font-bold text-hijau leading-tight">
                      {date ? date.tanggal : item.tanggal}
                    </p>

                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="rounded-xl bg-neutral-50/90 p-2 border border-black/5">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-hijau-tua/60 flex items-center gap-1">
                          <span>🕌</span>
                          <span>Khotib</span>
                        </dt>
                        <dd className="mt-0.5 font-bold text-hijau-tua text-xs leading-snug line-clamp-2 min-h-[30px]">
                          {item.khatib}
                        </dd>
                      </div>

                      {item.imam && (
                        <div className="rounded-xl bg-neutral-50/90 p-2 border border-black/5">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-hijau-tua/60 flex items-center gap-1">
                            <span>📖</span>
                            <span>Imam</span>
                          </dt>
                          <dd className="mt-0.5 font-semibold text-hijau-tua text-[11px] truncate">
                            {item.imam}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="mt-3 border-t border-black/5 pt-2 text-[10px] text-hijau-tua/60 flex items-center justify-between">
                    <span>Jumat</span>
                    <span className="font-bold text-emerald-800">12:00 WIB</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Indikator Titik (Dots) Looping Mobile */}
        {totalCount >= 2 && (
          <div className="mt-3.5 flex justify-center items-center gap-1.5">
            {activeItems.map((_, idx) => {
              const currentActive = mobileIndex % totalCount === idx
              return (
                <button
                  key={`dot-khotib-${idx}`}
                  type="button"
                  onClick={() => {
                    setIsTransitioning(true)
                    setMobileIndex(idx)
                  }}
                  aria-label={`Lihat jadwal Jumat ke-${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentActive ? 'w-5 bg-emas-tua' : 'w-1.5 bg-emas/35'
                  }`}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

