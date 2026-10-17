'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/laporan-kas', label: 'Ringkasan Kategori' },
  { href: '/laporan-kas/transaksi', label: 'Daftar Transaksi' },
]

/**
 * Navigasi tab untuk laporan kas publik. Dua tampilan dipisah menjadi dua
 * route (`/laporan-kas` dan `/laporan-kas/transaksi`) karena `DataTable`
 * memakai nama param global (`q`,`page`,`size`,`sort`,`dir`) — dua tabel di
 * halaman yang sama akan berebut param yang sama.
 */
export function LaporanKasTabs() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Tampilan laporan kas"
      className="mb-6 flex gap-1 border-b border-emas/25"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'border-b-2 border-hijau px-4 py-2 text-sm font-semibold text-hijau'
                : 'border-b-2 border-transparent px-4 py-2 text-sm text-hijau-tua/70 hover:text-hijau'
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
