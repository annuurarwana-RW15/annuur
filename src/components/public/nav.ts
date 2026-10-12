export interface PublicNavItem {
  label: string
  href: string
}

export const PUBLIC_NAV: readonly PublicNavItem[] = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: 'Berita', href: '/berita' },
  { label: 'Galeri', href: '/galeri' },
  { label: 'Laporan Kas', href: '/laporan-kas' },
  { label: 'Donasi', href: '/donasi' },
  { label: 'Kontak', href: '/kontak' },
]
