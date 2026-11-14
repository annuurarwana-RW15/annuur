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
  { label: "Al-Qur'an", href: '/quran' },
  {
    label: 'Kegiatan & Program',
    children: [
      {
        label: 'Agenda Kegiatan',
        href: '/kegiatan',
        description: 'Jadwal kajian, pengajian rutin, dan agenda keumatan',
      },
      {
        label: 'Program Kerja',
        href: '/program',
        description: 'Rencana kerja jangka pendek & panjang beserta capaian',
      },
      {
        label: 'Proposal Terbuka',
        href: '/proposal',
        description: 'Peluang amal jariyah, target RAB, & unduh proposal resmi',
      },
    ],
  },
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
  {
    label: 'Hubungi',
    children: [
      {
        label: 'Profil',
        href: '/profil',
        description: 'Sejarah, visi misi, & struktur kepengurusan',
      },
      {
        label: 'Galeri',
        href: '/galeri',
        description: 'Dokumentasi foto sarana & kegiatan masjid',
      },
      {
        label: 'Kontak',
        href: '/kontak',
        description: 'Alamat, lokasi Google Maps, & nomor pengurus',
      },
    ],
  },
]
