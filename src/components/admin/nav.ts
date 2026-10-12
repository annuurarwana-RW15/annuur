import type { Action } from '@/lib/rbac'

export interface NavChild {
  label: string
  href: string
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
  { label: 'Sections', href: '/admin/sections', action: 'manage_sections' },
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
  { label: 'Analitik', href: '/admin/analitik', action: 'view_analytics' },
  { label: 'Pengaturan', href: '/admin/pengaturan', action: 'manage_settings' },
]
