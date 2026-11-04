'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
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

function LoginIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function DashboardIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

function LogoutIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export interface PublicHeaderUser {
  name: string
  role?: string
}

export interface PublicHeaderProps {
  siteName: string
  user?: PublicHeaderUser | null
}

/**
 * Header publik: navigasi inline di layar besar (lg+) dan menu drop down
 * yang di-toggle tombol hamburger di layar kecil. Panel selalu dirender
 * (attr `hidden` saat tertutup) agar `aria-controls` tidak menyasar id
 * yang tidak ada.
 */
export function PublicHeader({ siteName, user }: PublicHeaderProps) {
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

        {/* Akses Login / Dashboard Desktop */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-emas px-3.5 py-1.5 text-xs font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
                title={`Masuk ke Dashboard (${user.name})`}
              >
                <DashboardIcon className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/' })}
                className="inline-flex items-center gap-1.5 rounded-full border border-krem/30 px-3 py-1.5 text-xs font-medium text-krem/80 transition hover:bg-krem/10 hover:text-krem"
                title="Keluar"
              >
                <LogoutIcon className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-emas/70 px-3.5 py-1.5 text-xs font-semibold text-emas transition hover:bg-emas hover:text-hijau"
            >
              <LoginIcon className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>

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

          <div className="my-2 border-t border-emas/20 pt-2">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="px-3 text-xs text-krem/70">
                  Masuk sebagai <strong className="font-semibold text-krem">{user.name}</strong>
                  {user.role && (
                    <span className="ms-1.5 rounded bg-emas/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emas">
                      {user.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emas px-4 py-2.5 text-sm font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
                  >
                    <DashboardIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      void signOut({ callbackUrl: '/' })
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-krem/30 px-4 py-2.5 text-sm font-medium text-krem transition hover:bg-krem/10"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-emas/70 px-4 py-2.5 text-sm font-semibold text-emas transition hover:bg-emas hover:text-hijau"
              >
                <LoginIcon className="h-4 w-4" />
                <span>Masuk Admin</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
