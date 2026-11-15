'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { testimoniItems, type TestimoniItem } from './content'
import { SectionHeading } from './SectionHeading'

export function TestimoniSection({ section }: { section: Section }) {
  const items = testimoniItems(readField(section.content, 'testimoni', 'items'))
  const headingId = useId()

  const [mobileIndex, setMobileIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartXRef = useRef(0)

  const totalMobileCards = items.length

  const nextMobile = useCallback(() => {
    if (totalMobileCards <= 1) return
    setMobileIndex((prev) => (prev + 1) % totalMobileCards)
  }, [totalMobileCards])

  const prevMobile = useCallback(() => {
    if (totalMobileCards <= 1) return
    setMobileIndex((prev) => (prev - 1 + totalMobileCards) % totalMobileCards)
  }, [totalMobileCards])

  // Auto-slide mobile card secara berkala
  useEffect(() => {
    if (isSwiping || totalMobileCards <= 1) return

    const timer = setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % totalMobileCards)
    }, 4500)

    return () => clearInterval(timer)
  }, [isSwiping, totalMobileCards])

  // Touch Swipe untuk Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const diff = touchStartXRef.current - endX
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextMobile()
      } else {
        prevMobile()
      }
    }
    setIsSwiping(false)
  }

  // Gandakan item jika jumlahnya sedikit agar track looping desktop cukup lebar
  const baseRollingItems: TestimoniItem[] =
    items.length > 0 && items.length < 4 ? [...items, ...items, ...items] : items

  const rollDuration = Math.max(baseRollingItems.length * 7, 24)

  return (
    <section
      id="testimoni"
      aria-labelledby={headingId}
      className="bg-krem-tua/60 overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div>
          <SectionHeading id={headingId}>{section.title}</SectionHeading>
          <p className="mt-1 text-sm text-hijau-tua/75">
            Kesan dan pengalaman jamaah bersama Masjid An-nuur Arwana.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada testimoni.</p>
        ) : (
          <>
            {/* 1. TAMPILAN DESKTOP: Auto Rolling dan Looping Mulus (Pause saat Hover) */}
            <div
              className="hidden md:block mt-8 overflow-hidden relative mask-marquee group"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                className="flex w-max animate-rolling-marquee group-hover:[animation-play-state:paused]"
                style={{
                  animationPlayState: isHovered ? 'paused' : 'running',
                  animationDuration: `${rollDuration}s`,
                }}
              >
                {/* Track Set 1 */}
                <div className="flex shrink-0 gap-6 pr-6">
                  {baseRollingItems.map((item, idx) => (
                    <article
                      key={`roll-1-${item.nama}-${idx}`}
                      className="w-[360px] lg:w-[380px] shrink-0 flex flex-col justify-between rounded-2xl border-2 border-emas/30 bg-white p-6 shadow-xs transition-all duration-300 hover:border-emas hover:shadow-md hover:-translate-y-1"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span aria-hidden="true" className="font-display text-5xl leading-none text-emas/60">
                            &ldquo;
                          </span>
                          {item.rating !== null && (
                            <p
                              className="text-emas text-sm tracking-wider"
                              aria-label={`Penilaian ${item.rating} dari 5`}
                            >
                              {'★'.repeat(item.rating)}
                              {'☆'.repeat(5 - item.rating)}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 leading-relaxed text-hijau-tua/85 italic text-sm lg:text-base">
                          &ldquo;{item.teks}&rdquo;
                        </p>
                      </div>
                      <footer className="mt-6 border-t border-emas/20 pt-4">
                        <p className="font-semibold text-hijau">{item.nama}</p>
                        {item.peran && <p className="text-xs text-hijau-tua/70 mt-0.5">{item.peran}</p>}
                      </footer>
                    </article>
                  ))}
                </div>

                {/* Track Set 2 (Kloning untuk infinite loop tanpa jeda) */}
                <div className="flex shrink-0 gap-6 pr-6" aria-hidden="true">
                  {baseRollingItems.map((item, idx) => (
                    <article
                      key={`roll-2-${item.nama}-${idx}`}
                      className="w-[360px] lg:w-[380px] shrink-0 flex flex-col justify-between rounded-2xl border-2 border-emas/30 bg-white p-6 shadow-xs transition-all duration-300 hover:border-emas hover:shadow-md hover:-translate-y-1"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span aria-hidden="true" className="font-display text-5xl leading-none text-emas/60">
                            &ldquo;
                          </span>
                          {item.rating !== null && (
                            <p className="text-emas text-sm tracking-wider">
                              {'★'.repeat(item.rating)}
                              {'☆'.repeat(5 - item.rating)}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 leading-relaxed text-hijau-tua/85 italic text-sm lg:text-base">
                          &ldquo;{item.teks}&rdquo;
                        </p>
                      </div>
                      <footer className="mt-6 border-t border-emas/20 pt-4">
                        <p className="font-semibold text-hijau">{item.nama}</p>
                        {item.peran && <p className="text-xs text-hijau-tua/70 mt-0.5">{item.peran}</p>}
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TAMPILAN MOBILE: Card muncul animasi zoom in bergantian */}
            <div
              className="md:hidden mt-6"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative min-h-[260px] flex items-center justify-center">
                {items.map((item, idx) => {
                  if (idx !== mobileIndex) return null
                  return (
                    <article
                      key={`mobile-card-${mobileIndex}`}
                      className="w-full flex flex-col justify-between rounded-2xl border-2 border-emas/30 bg-white p-6 shadow-md animate-zoom-in"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span aria-hidden="true" className="font-display text-5xl leading-none text-emas/70">
                            &ldquo;
                          </span>
                          <span className="rounded-full bg-emas/15 px-2.5 py-0.5 text-[11px] font-semibold text-emas-tua">
                            {mobileIndex + 1} / {items.length}
                          </span>
                        </div>
                        <p className="leading-relaxed text-hijau-tua/90 italic text-sm">
                          &ldquo;{item.teks}&rdquo;
                        </p>
                        {item.rating !== null && (
                          <p
                            className="mt-3 text-emas text-base tracking-widest"
                            aria-label={`Penilaian ${item.rating} dari 5`}
                          >
                            {'★'.repeat(item.rating)}
                            {'☆'.repeat(5 - item.rating)}
                          </p>
                        )}
                      </div>

                      <footer className="mt-6 border-t border-emas/20 pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-hijau text-sm">{item.nama}</p>
                          {item.peran && <p className="text-xs text-hijau-tua/70">{item.peran}</p>}
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          Geser &rarr;
                        </span>
                      </footer>
                    </article>
                  )
                })}
              </div>

              {/* Indikator Titik Posisi Mobile (Tanpa Tombol Navigasi) */}
              {items.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
                  {items.map((_, idx) => (
                    <span
                      key={`mobile-dot-${idx}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        mobileIndex === idx
                          ? 'w-6 bg-emas-tua'
                          : 'w-1.5 bg-emas/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
