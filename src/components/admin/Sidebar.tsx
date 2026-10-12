'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import { LogoutButton } from './LogoutButton'
import type { NavChild, NavItem } from './nav'

export interface SidebarProps {
  items: NavItem[]
  user: { name: string; role: Role }
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ href, label, nested }: { href: string; label: string; nested?: boolean }) {
  const pathname = usePathname()
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-md px-3 py-2 text-sm whitespace-nowrap transition ${
        nested ? 'md:pl-8' : ''
      } ${
        active
          ? 'bg-[#F5EFE2] font-semibold text-[#0F4C3A]'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

export function Sidebar({ items, user }: SidebarProps): React.JSX.Element {
  return (
    <aside className="no-print flex flex-col border-b border-black/10 bg-[#0F4C3A] md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="px-4 py-4 md:py-6">
        <p className="text-sm font-semibold tracking-wide text-white">
          Masjid An-Nur Arwana
        </p>
        <p className="mt-0.5 text-xs text-[#F5EFE2]/70">Panel Admin</p>
      </div>

      <nav
        aria-label="Navigasi admin"
        className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-3 md:pb-4"
      >
        {items.map((item) =>
          item.children ? (
            <div key={item.label} className="flex items-center gap-1 md:block">
              <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/50 md:mt-4 md:mb-1 md:block">
                {item.label}
              </span>
              <div className="flex gap-1 md:flex-col md:gap-0.5">
                {item.children.map((child: NavChild) => (
                  <NavLink key={child.href} href={child.href} label={child.label} nested />
                ))}
              </div>
            </div>
          ) : (
            <NavLink key={item.href} href={item.href ?? '/admin'} label={item.label} />
          ),
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <LogoutButton user={user} />
      </div>
    </aside>
  )
}
