'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { testimoniItems, type TestimoniItem } from './content'
import { SectionHeading } from './SectionHeading'

export function TestimoniSection({ section }: { section: Section }) {
  const items = testimoniItems(readField(section.content, 'testimoni', 'items'))
  const headingId = useId()

  // Kelompokkan 3 card dalam 1 kontainer untuk tampilan desktop
  const desktopSlides: TestimoniItem[][] = []
  for (let i = 0; i < items.length; i += 3) {
    desktopSlides.push(items.slice(i, i + 3))
  }

  const [desktopIndex, setDesktopIndex] = useState(0)
  const [mobileIndex, setMobileIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartXRef = useRef(0)

  const totalDesktopSlides = desktopSlides.length
  const totalMobileCards = items.length

  const nextDesktop = useCallback(() => {
    if (totalDesktopSlides <= 1) return
    setDesktopIndex((prev) => (prev + 1) % totalDesktopSlides)
  }, [totalDesktopSlides])

  const prevDesktop = useCallback(() => {
    if (totalDesktopSlides <= 1) return
    setDesktopIndex((prev) => (prev - 1 + totalDesktopSlides) % totalDesktopSlides)
  }, [totalDesktopSlides])

  const nextMobile = useCallback(() => {
    if (totalMobileCards <= 1) return
    setMobileIndex((prev) => (prev + 1) % totalMobileCards)
  }, [totalMobileCards])

  const prevMobile = useCallback(() => {
    if (totalMobileCards <= 1) return
    setMobileIndex((prev) => (prev - 1 + totalMobileCards) % totalMobileCards)
  }, [totalMobileCards])

  // Auto-play bergantian yang halus (jeda saat hover/sentuh)
  useEffect(() => {
    if (isPaused || totalMobileCards <= 1) return

    const timer = setInterval(() => {
      // Auto-slide mobile tiap interval
      setMobileIndex((prev) => (prev + 1) % totalMobileCards)
      // Auto-slide desktop
      if (totalDesktopSlides > 1) {
        setDesktopIndex((prev) => (prev + 1) % totalDesktopSlides)
      }
    }, 5500)

    return () => clearInterval(timer)
  }, [isPaused, totalMobileCards, totalDesktopSlides])

  // Touch Swipe untuk Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    setIsPaused(true)
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
    setIsPaused(false)
  }

  return (
    <section
      id="testimoni"
      aria-labelledby={headingId}
      className="bg-krem-tua/60 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <SectionHeading id={headingId}>{section.title}</SectionHeading>
            <p className="mt-1 text-sm text-hijau-tua/75">
              Kesan dan pengalaman jamaah bersama Masjid An-nuur Arwana.
            </p>
          </div>

          {/* Navigasi Slide Desktop (≥ md) */}
          {totalDesktopSlides > 1 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={prevDesktop}
                aria-label="Slide testimoni sebelumnya"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau transition hover:border-emas hover:bg-emas/15 active:scale-95 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextDesktop}
                aria-label="Slide testimoni berikutnya"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau transition hover:border-emas hover:bg-emas/15 active:scale-95 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada testimoni.</p>
        ) : (
          <>
            {/* 1. TAMPILAN DESKTOP: Slide Smooth, tiap slide 3 card dalam 1 kontainer */}
            <div className="hidden md:block mt-8 overflow-hidden">
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: `translateX(-${desktopIndex * 100}%)`,
                }}
              >
                {desktopSlides.map((slideGroup, slideIdx) => (
                  <div
                    key={`desktop-slide-${slideIdx}`}
                    className="w-full shrink-0 grid grid-cols-3 gap-6 px-1"
                  >
                    {slideGroup.map((item, itemIdx) => (
                      <article
                        key={`${item.nama}-${slideIdx}-${itemIdx}`}
                        className="flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-6 shadow-sm transition-all duration-300 hover:border-emas/50 hover:shadow-md"
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
                ))}
              </div>

              {/* Indikator Dots Desktop */}
              {totalDesktopSlides > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  {desktopSlides.map((_, idx) => (
                    <button
                      key={`desktop-dot-${idx}`}
                      type="button"
                      onClick={() => setDesktopIndex(idx)}
                      aria-label={`Buka slide testimoni ke-${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        desktopIndex === idx
                          ? 'w-8 bg-emas-tua'
                          : 'w-2.5 bg-emas/30 hover:bg-emas/60'
                      }`}
                    />
                  ))}
                </div>
              )}
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

              {/* Navigasi & Dots Mobile */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMobile}
                  aria-label="Testimoni sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau shadow-sm transition active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-1.5">
                  {items.map((_, idx) => (
                    <button
                      key={`mobile-dot-${idx}`}
                      type="button"
                      onClick={() => setMobileIndex(idx)}
                      aria-label={`Buka testimoni nomor ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        mobileIndex === idx
                          ? 'w-6 bg-emas-tua'
                          : 'w-2 bg-emas/30'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={nextMobile}
                  aria-label="Testimoni berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-emas/40 bg-white text-hijau shadow-sm transition active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
