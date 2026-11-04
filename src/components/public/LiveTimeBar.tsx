'use client'

import { useEffect, useState } from 'react'
import { formatFullIndonesianDateTime } from '@/lib/hijri'

export function LiveTimeBar() {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const { dayName, dateMasehi, timeWib, hijriText } = formatFullIndonesianDateTime(now)

  return (
    <div
      aria-label="Waktu dan penanggalan saat ini"
      className="border-b border-emas/30 bg-[#0c3c2e] text-krem/90 shadow-inner"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs sm:text-sm">
        {/* Tanggal Masehi & Hari */}
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emas/20 text-emas">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
          </span>
          <span className="font-medium text-krem">
            {dayName}, {dateMasehi}
          </span>
          <span className="hidden text-emas/50 sm:inline" aria-hidden="true">
            &bull;
          </span>
          <span className="hidden items-center gap-1 rounded bg-emas/15 px-2 py-0.5 font-semibold text-emas-muda sm:inline-flex">
            <span aria-hidden="true">🌙</span>
            <span>{hijriText}</span>
          </span>
        </div>

        {/* Waktu Sekarang (Jam, Menit, Detik WIB) */}
        <div className="flex items-center gap-2 ms-auto sm:ms-0">
          <span className="inline-flex sm:hidden items-center gap-1 text-[11px] text-emas-muda me-1">
            <span>{hijriText}</span>
          </span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emas/20 text-emas">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span
            suppressHydrationWarning
            className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-emas-muda tabular-nums"
          >
            {mounted ? timeWib : 'WIB'}
          </span>
        </div>
      </div>
    </div>
  )
}

