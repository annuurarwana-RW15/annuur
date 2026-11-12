export interface PublicNavChild {
  label: string
  href: string
  description?: string
}

export interface PublicNavItem {
  label: string
  href?: string
  children?: readonly PublicNavChild[]
}

export const PUBLIC_NAV: readonly PublicNavItem[] = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: "Al-Qur'an", href: '/quran' },
  { label: 'Kegiatan & Program', href: '/kegiatan' },
  { label: 'Berita & Artikel', href: '/berita' },
  {
    label: 'Donasi & Kas',
    children: [
      {
        label: 'Donasi Online',
        href: '/donasi',
        description: 'Infaq, sedekah, dan konfirmasi transfer',
      },
      {
        label: 'Laporan Kas',
        href: '/laporan-kas',
        description: 'Transparansi saldo & pembukuan kas',
      },
      {
        label: 'Cek Status Donasi',
        href: '/donasi/status',
        description: 'Pantau verifikasi bukti donasi jamaah',
      },
      {
        label: 'Rincian Transaksi',
        href: '/laporan-kas/transaksi',
        description: 'Mutasi pemasukan & pengeluaran kas',
      },
    ],
  },
  { label: 'Galeri', href: '/galeri' },
  { label: 'Kontak', href: '/kontak' },
]
