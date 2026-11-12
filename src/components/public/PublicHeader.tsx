'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_NAV, type PublicNavChild, type PublicNavItem } from './nav'

function DomeMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 xl:h-6 xl:w-6">
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
      className="h-5 w-5"
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
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function DonasiIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function KasIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 6v12" />
    </svg>
  )
}

function StatusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function TransaksiIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  )
}

function getChildIcon(href: string) {
  if (href.includes('status')) return <StatusIcon className="h-4 w-4" />
  if (href.includes('transaksi')) return <TransaksiIcon className="h-4 w-4" />
  if (href.includes('donasi')) return <DonasiIcon className="h-4 w-4" />
  return <KasIcon className="h-4 w-4" />
}

function LoginIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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

function DashboardIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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

function LogoutIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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

export function PublicHeader({ siteName, user }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({
    'Donasi & Kas': true,
  })

  let pathname = '/'
  try {
    const current = usePathname()
    if (current) pathname = current
  } catch {
    pathname = '/'
  }

  const headerRef = useRef<HTMLElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current)
    setOpenDropdown(label)
  }

  const handleDropdownLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 150)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setOpenDropdown(null)
        toggleRef.current?.focus()
      }
    }
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null
      if (target && headerRef.current && !headerRef.current.contains(target)) {
        setMobileOpen(false)
        setOpenDropdown(null)
      }
    }
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
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
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current)
    }
  }, [])

  const isItemActive = (item: PublicNavItem): boolean => {
    if (item.href) {
      if (item.href === '/') return pathname === '/'
      return pathname === item.href || pathname.startsWith(item.href + '/')
    }
    if (item.children) {
      return item.children.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
      )
    }
    return false
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-emas/25 bg-hijau/95 text-krem shadow-xs backdrop-blur-md transition-colors"
    >
      <div className="mx-auto flex max-w-6xl xl:max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 transition hover:text-emas-muda"
        >
          <span className="grid h-8 w-8 xl:h-9 xl:w-9 shrink-0 place-items-center rounded-full bg-emas text-hijau shadow-xs">
            <DomeMark />
          </span>
          <span className="truncate font-display text-base font-bold leading-tight sm:text-lg">
            {siteName}
          </span>
        </Link>

        {/* Navigasi Utama Desktop */}
        <nav
          aria-label="Navigasi utama"
          className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1"
        >
          {PUBLIC_NAV.map((item) => {
            const active = isItemActive(item)

            // Item dengan Dropdown
            if (item.children && item.children.length > 0) {
              const isOpen = openDropdown === item.label

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.label)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenDropdown((prev) =>
                        prev === item.label ? null : item.label,
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 xl:px-3 xl:py-1.5 xl:text-[13px] ${
                      active
                        ? 'bg-white/15 text-emas font-semibold shadow-xs ring-1 ring-emas/30'
                        : 'text-krem/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emas' : 'opacity-70'
                      }`}
                    />
                  </button>

                  {/* Dropdown Floating Panel */}
                  {isOpen && (
                    <div className="absolute left-1/2 top-full -translate-x-1/2 pt-1.5 z-50">
                      <div className="w-72 xl:w-80 rounded-2xl border border-emas/30 bg-hijau-tua/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/20 animate-in fade-in-0 zoom-in-95">
                        <div className="flex flex-col gap-0.5">
                          {item.children.map((child: PublicNavChild) => {
                            const isChildActive =
                              pathname === child.href ||
                              pathname.startsWith(child.href + '/')

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setOpenDropdown(null)}
                                className={`group flex items-start gap-2.5 rounded-xl p-2 transition-all duration-150 ${
                                  isChildActive
                                    ? 'bg-white/15 text-white ring-1 ring-emas/40'
                                    : 'text-krem/90 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span
                                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${
                                    isChildActive
                                      ? 'bg-emas text-hijau shadow-xs'
                                      : 'bg-emas/15 text-emas group-hover:bg-emas group-hover:text-hijau'
                                  }`}
                                >
                                  {getChildIcon(child.href)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold leading-tight group-hover:text-emas-muda">
                                    {child.label}
                                  </p>
                                  {child.description && (
                                    <p className="mt-0.5 truncate text-[11px] text-krem/60 leading-tight">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // Link Standar
            return (
              <Link
                key={item.href || item.label}
                href={item.href || '#'}
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 xl:px-3 xl:py-1.5 xl:text-[13px] whitespace-nowrap ${
                  active
                    ? 'bg-white/15 text-emas font-semibold shadow-xs ring-1 ring-emas/30'
                    : 'text-krem/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Akses Login / Dashboard Desktop */}
        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          {user ? (
            <>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-emas px-3 py-1 text-xs font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
                title={`Masuk ke Dashboard (${user.name})`}
              >
                <DashboardIcon className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/' })}
                className="inline-flex items-center gap-1 rounded-full border border-krem/30 px-2.5 py-1 text-xs font-medium text-krem/80 transition hover:bg-krem/10 hover:text-krem"
                title="Keluar"
              >
                <LogoutIcon className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-emas/70 px-3 py-1 text-xs font-semibold text-emas transition hover:bg-emas hover:text-hijau"
            >
              <LoginIcon className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>

        {/* Tombol Hamburger Mobile */}
        <button
          ref={toggleRef}
          type="button"
          className="ms-auto shrink-0 rounded-full border border-emas/40 p-1.5 text-krem transition hover:bg-krem/10 lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="menu-utama"
          aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <MenuIcon open={mobileOpen} />
        </button>
      </div>

      {/* Menu Drawer Mobile */}
      <nav
        id="menu-utama"
        aria-label="Menu utama"
        hidden={!mobileOpen}
        className="border-t border-emas/30 bg-hijau-tua/95 text-krem shadow-xl backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {PUBLIC_NAV.map((item) => {
            const active = isItemActive(item)

            // Dropdown accordion di mobile
            if (item.children && item.children.length > 0) {
              const isExpanded = Boolean(mobileExpanded[item.label])

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileExpanded((prev) => ({
                        ...prev,
                        [item.label]: !prev[item.label],
                      }))
                    }
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      active ? 'text-emas bg-white/10' : 'text-krem/90 hover:bg-white/10'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-emas' : 'opacity-70'
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="my-1 ml-3 flex flex-col gap-1 border-l-2 border-emas/30 pl-2">
                      {item.children.map((child: PublicNavChild) => {
                        const isChildActive =
                          pathname === child.href ||
                          pathname.startsWith(child.href + '/')

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-start gap-2.5 rounded-lg p-2 text-xs transition ${
                              isChildActive
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-krem/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className="mt-0.5 text-emas shrink-0">
                              {getChildIcon(child.href)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-tight">
                                {child.label}
                              </p>
                              {child.description && (
                                <p className="text-[10px] text-krem/60 leading-tight">
                                  {child.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Link biasa di mobile
            return (
              <Link
                key={item.href || item.label}
                href={item.href || '#'}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/15 text-emas font-semibold'
                    : 'text-krem/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}

          {/* Area Auth Mobile */}
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
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emas px-4 py-2 text-xs font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
                  >
                    <DashboardIcon className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      void signOut({ callbackUrl: '/' })
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-krem/30 px-3 py-2 text-xs font-medium text-krem transition hover:bg-krem/10"
                  >
                    <LogoutIcon className="h-3.5 w-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-emas/70 px-4 py-2 text-xs font-semibold text-emas transition hover:bg-emas hover:text-hijau"
              >
                <LoginIcon className="h-3.5 w-3.5" />
                <span>Masuk Admin</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
