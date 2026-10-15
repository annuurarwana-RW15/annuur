import type { Role } from '@prisma/client'
import { can, type Action } from '@/lib/rbac'

export interface NavChild {
  label: string
  href: string
  /** Bila ada, child hanya tampil bila role punya aksi ini (lihat lib/rbac). */
  action?: Action
}

export interface NavItem {
  label: string
  href?: string
  children?: NavChild[]
  /** Bila ada, item hanya tampil bila role punya aksi ini (lihat lib/rbac). */
  action?: Action
}

export const ADMIN_NAV: readonly NavItem[] = [
  { label: 'Ringkasan', href: '/admin' },
  { label: 'Analitik', href: '/admin/analitik', action: 'view_analytics' },
  { label: 'Artikel', href: '/admin/artikel', action: 'manage_articles' },
  {
    label: 'Kas',
    action: 'manage_transactions',
    children: [
      { label: 'Transaksi', href: '/admin/kas/transaksi' },
      { label: 'Kategori', href: '/admin/kas/kategori' },
      { label: 'Periode', href: '/admin/kas/periode' },
      { label: 'Laporan', href: '/admin/kas/laporan' },
    ],
  },
  { label: 'Donasi', href: '/admin/donasi', action: 'verify_donations' },
  { label: 'Pengguna', href: '/admin/pengguna', action: 'manage_users' },
  {
    label: 'Pengaturan',
    children: [
      { label: 'Umum', href: '/admin/pengaturan', action: 'manage_settings' },
      { label: 'Sections', href: '/admin/sections', action: 'manage_sections' },
    ],
  },
]

/**
 * Nav yang tampil untuk role: item/child tanpa hak akses dibuang; grup tanpa
 * child yang tampil ikut dibuang.
 */
export function visibleAdminNav(role: Role): NavItem[] {
  return ADMIN_NAV.flatMap((item) => {
    if (item.action && !can(role, item.action)) return []
    if (!item.children) return [item]
    const children = item.children.filter(
      (child) => !child.action || can(role, child.action),
    )
    return children.length > 0 ? [{ ...item, children }] : []
  })
}
