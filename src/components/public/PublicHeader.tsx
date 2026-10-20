'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_NAV } from './nav'

function DomeMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6">
      <circle cx="16" cy="4.5" r="1.6" fill="currentColor" />
      <path
        d="M7.5 21c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5z"
        fill="currentColor"
      />
      <rect x="4.5" y="21" width="23" height="2.6" rx="1.3" fill="currentColor" />
      <path
        d="M13.6 23.6v-1.4a2.4 2.4 0 0 1 4.8 0v1.4z"
        fill="#0F4C3A"
        opacity="0.55"
      />
      <rect x="2" y="15" width="2" height="8.6" rx="1" fill="currentColor" />
      <rect x="28" y="15" width="2" height="8.6" rx="1" fill="currentColor" />
      <circle cx="3" cy="13.6" r="1.3" fill="currentColor" />
      <circle cx="29" cy="13.6" r="1.3" fill="currentColor" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

/**
 * Header publik: navigasi inline di layar besar (lg+) dan menu drop down
 * yang di-toggle tombol hamburger di layar kecil. Panel selalu dirender
 * (attr `hidden` saat tertutup) agar `aria-controls` tidak menyasar id
 * yang tidak ada.
 */
export function PublicHeader({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null
      if (target && headerRef.current && !headerRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const onResize = () => {
      // Pindah ke layar besar → navigasi inline kembali tampil, tutup panel.
      if (window.innerWidth >= 1024) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-emas/40 bg-hijau text-krem shadow-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 transition hover:text-emas-muda"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emas text-hijau">
            <DomeMark />
          </span>
          <span className="truncate font-display text-lg font-bold leading-tight">
            {siteName}
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden min-w-0 flex-1 items-center gap-1 lg:flex"
        >
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-krem/85 transition hover:bg-krem/10 hover:text-krem"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="ms-auto shrink-0 rounded-full border border-emas/50 p-2 text-krem transition hover:bg-krem/10 lg:hidden"
          aria-expanded={open}
          aria-controls="menu-utama"
          aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {/* Drop down mobile: di bawah header, menutup saat link diklik. */}
      <nav
        id="menu-utama"
        aria-label="Menu utama"
        hidden={!open}
        className="border-t border-emas/30 bg-hijau shadow-lg lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-2.5 text-base font-medium text-krem/90 transition hover:bg-krem/10 hover:text-krem"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
