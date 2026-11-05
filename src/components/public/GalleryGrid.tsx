'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GalleryItem } from './content'

interface GalleryGridProps {
  items: GalleryItem[]
  className?: string
}

export function GalleryGrid({
  items,
  className = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, hasMoved: false })
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 })
  const touchStartPosRef = useRef({ x: 0, y: 0 })
  const [showHint, setShowHint] = useState(true)

  // Reset zoom & pan saat foto berganti
  const resetZoom = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
  }, [])

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    resetZoom()
    setShowHint(true)
  }

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
    resetZoom()
  }, [resetZoom])

  const nextImage = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex((prev) => ((prev ?? 0) + 1) % items.length)
    resetZoom()
  }, [selectedIndex, items.length, resetZoom])

  const prevImage = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex((prev) => ((prev ?? 0) - 1 + items.length) % items.length)
    resetZoom()
  }, [selectedIndex, items.length, resetZoom])

  // Toggle Zoom: 1x -> 2.2x -> 1x
  const toggleZoom = useCallback(() => {
    setScale((current) => {
      if (current <= 1.05) {
        return 2.2
      }
      setPan({ x: 0, y: 0 })
      return 1
    })
  }, [])

  const zoomIn = () => {
    setScale((s) => Math.min(s + 0.5, 3.5))
  }

  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1)
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }

  // Handle Keyboard Navigasi & Shortcuts
  useEffect(() => {
    if (selectedIndex === null) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'ArrowLeft') prevImage()
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') resetZoom()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, closeLightbox, nextImage, prevImage, resetZoom])

  // Kunci scroll body saat modal aktif
  useEffect(() => {
    if (selectedIndex !== null) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [selectedIndex])

  // Mouse Drag untuk Pan gambar saat di-zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      hasMoved: false,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true
    }
    const maxPan = 400 * (scale - 1)
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Klik pada gambar
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Jika baru saja dragging mouse, jangan toggle zoom
    if (dragStartRef.current.hasMoved) {
      dragStartRef.current.hasMoved = false
      return
    }
    toggleZoom()
  }

  // Touch Events untuk Mobile: Double Tap Zoom & Touch Drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      if (scale > 1) {
        setIsDragging(true)
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          panX: pan.x,
          panY: pan.y,
          hasMoved: false,
        }
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - dragStartRef.current.x
    const dy = touch.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true
    }
    const maxPan = 400 * (scale - 1)
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
    })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    if (!touch) return

    const now = Date.now()
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)

    // Jika ketukan diam (bukan swipe geser)
    if (dx < 15 && dy < 15) {
      const timeDiff = now - lastTapRef.current.time
      const distFromLastTap = Math.hypot(
        touch.clientX - lastTapRef.current.x,
        touch.clientY - lastTapRef.current.y,
      )

      // Double Tap terdeteksi (< 320ms dan jarak berdekatan)
      if (timeDiff < 320 && distFromLastTap < 40) {
        e.preventDefault()
        toggleZoom()
        lastTapRef.current = { time: 0, x: 0, y: 0 }
      } else {
        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY }
      }
    }

    setIsDragging(false)
  }

  const activeItem = selectedIndex !== null ? items[selectedIndex] : null

  return (
    <>
      {/* Grid Galeri */}
      <ul className={`grid gap-4 ${className}`.trim()}>
        {items.map((item, index) => (
          <li
            key={`${item.url}-${index}`}
            className="group relative overflow-hidden rounded-2xl border border-emas/25 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emas hover:shadow-md cursor-pointer"
            onClick={() => openLightbox(index)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openLightbox(index)}
            tabIndex={0}
            role="button"
            aria-label={`Buka dan perbesar foto: ${galleryAlt(item)}`}
          >
            <figure className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL galeri dari penyimpanan eksternal, di luar image optimizer */}
              <img
                src={item.url}
                alt={galleryAlt(item)}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Overlay Kaca Pembesar / Zoom Indicator saat Hover */}
              <div className="absolute inset-0 bg-hijau-tua/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-hijau shadow-lg transform translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                  <svg className="w-3.5 h-3.5 text-emas" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  Perbesar Foto
                </span>
              </div>

              {item.caption && (
                <figcaption className="px-3 py-2 text-xs font-medium text-hijau-tua/80 line-clamp-1 border-t border-emas/15 bg-white/90">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      {/* Lightbox / Zoom Modal */}
      {activeItem && selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Penampil Foto Galeri dengan Fitur Zoom"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md select-none touch-none animate-fadeIn"
          onClick={closeLightbox}
        >
          {/* Top Bar / Toolbar */}
          <div
            className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-neutral-200">
                {selectedIndex + 1} / {items.length}
              </span>
              {activeItem.caption && (
                <span className="hidden sm:inline-block max-w-md truncate text-sm font-medium text-white/90">
                  {activeItem.caption}
                </span>
              )}
            </div>

            {/* Tombol Kontrol Zoom & Close */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= 1}
                aria-label="Perkecil zoom"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
              </button>

              <button
                type="button"
                onClick={resetZoom}
                aria-label="Reset zoom normal"
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-mono font-medium text-neutral-200 transition hover:bg-white/20 active:scale-95"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= 3.5}
                aria-label="Perbesar zoom"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <div className="h-5 w-px bg-white/20 mx-1" />

              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Tutup penampil gambar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-red-600/80 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigasi Kiri (Prev) */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
              aria-label="Foto sebelumnya"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-emas/80 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Navigasi Kanan (Next) */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
              aria-label="Foto selanjutnya"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-emas/80 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Area Utama Gambar dengan Zoom & Pan */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              onClick={handleImageClick}
              className={`max-w-full max-h-full flex items-center justify-center transition-transform ${
                isDragging ? 'duration-0' : 'duration-300 ease-out'
              } ${scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
              style={{
                transform: `scale(${scale}) translate3d(${pan.x / scale}px, ${pan.y / scale}px, 0)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeItem.url}
                alt={galleryAlt(activeItem)}
                className="max-h-[78vh] sm:max-h-[82vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>
          </div>

          {/* Bottom Bar: Caption & Petunjuk Interaktif */}
          <div
            className="p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent z-20 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activeItem.caption && (
              <p className="text-sm font-medium text-white mb-2 sm:hidden px-4">
                {activeItem.caption}
              </p>
            )}

            {showHint && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-neutral-300 backdrop-blur-sm">
                <span className="hidden sm:inline">💡 Klik foto untuk Zoom In / Out • Geser untuk menggeser foto</span>
                <span className="sm:hidden">💡 Ketuk 2× pada layar untuk Zoom In / Out</span>
                <button
                  type="button"
                  onClick={() => setShowHint(false)}
                  className="ml-1 text-neutral-400 hover:text-white"
                  aria-label="Tutup petunjuk"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function galleryAlt(item: GalleryItem): string {
  if (item.caption) return item.caption
  try {
    const last = new URL(item.url, 'https://placeholder.invalid').pathname
      .split('/')
      .pop()
    const name = decodeURIComponent(last || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_+]+/g, ' ')
      .trim()
    if (name) return `Foto ${name}`
  } catch {
    /* Fallback URL */
  }
  return 'Foto galeri Masjid An-nuur Arwana'
}
