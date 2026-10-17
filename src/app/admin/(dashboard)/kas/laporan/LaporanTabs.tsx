'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/kas/laporan', label: 'Rekap Kategori' },
  { href: '/admin/kas/laporan/jurnal', label: 'Jurnal' },
]

/**
 * Tab nav laporan kas. Dua tampilan dipisah route karena DataTable memakai
 * nama param global (q/page/size/sort/dir) — dua tabel di satu URL berebut.
 */
export function LaporanTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Tampilan laporan kas" className="mb-4 flex gap-1 border-b border-black/10">
      {TABS.map((tab) => {
        const active =
          tab.href === '/admin/kas/laporan'
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'border-b-2 border-green-900 px-4 py-2 text-sm font-semibold text-green-900'
                : 'border-b-2 border-transparent px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800'
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
