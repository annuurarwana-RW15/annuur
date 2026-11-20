// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PengumumanSectionTabs } from '@/components/public/PengumumanSectionTabs'
import type { KegiatanRutinItem } from '@/lib/kegiatan-rutin'
import type { ArticleCardData } from '@/components/public/ArticleCard'

const MOCK_KEGIATAN: KegiatanRutinItem[] = [
  {
    id: 'kegiatan-1',
    nama: 'Kajian Subuh Berjamaah',
    hari: 'AHAD',
    waktu: 'Ba’da Subuh - 06.30 WIB',
    lokasi: 'Ruang Utama Masjid',
    pemateri: 'Ust. H. Ahmad Fauzi, Lc.',
    kategori: 'KAJIAN_UMUM',
    deskripsi: 'Tafsir ayat-ayat pilihan.',
    isActive: true,
    urutan: 1,
  },
  {
    id: 'kegiatan-2',
    nama: 'Tahsin & Tahfidz Al-Quran',
    hari: 'SENIN',
    waktu: 'Ba’da Maghrib - Isya',
    lokasi: 'Serambi Masjid',
    pemateri: 'Ustadz Pembina Tahfidz',
    kategori: 'REMAJA',
    deskripsi: 'Bimbingan makhraj dan tajwid.',
    isActive: true,
    urutan: 2,
  },
]

const MOCK_ARTICLES: ArticleCardData[] = [
  {
    slug: 'berita-santunan-ramadhan',
    title: 'Penyaluran Santunan Anak Yatim',
    excerpt: 'Dokumentasi penyaluran santunan.',
    coverImage: null,
    publishedAt: new Date('2026-11-10T00:00:00Z'),
    category: 'Kegiatan Sosial',
  },
]

afterEach(() => {
  cleanup()
})

describe('PengumumanSectionTabs — Desktop Grid & Mobile 1-Card Slider Looping', () => {
  it('merender tab Jadwal Rutin dan card kegiatan untuk desktop serta mobile slider', () => {
    render(
      <PengumumanSectionTabs
        sectionTitle="Pengumuman & Agenda Masjid"
        sectionText="Informasi kegiatan pekanan dan kabar terkini masjid."
        kegiatanRutinList={MOCK_KEGIATAN}
        articles={MOCK_ARTICLES}
      />
    )

    // Judul & Teks Section
    expect(screen.getByText('Pengumuman & Agenda Masjid')).toBeInTheDocument()
    expect(
      screen.getByText('Informasi kegiatan pekanan dan kabar terkini masjid.')
    ).toBeInTheDocument()

    // Tab buttons
    expect(screen.getByRole('button', { name: /Jadwal Rutin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pengumuman & Berita/i })).toBeInTheDocument()

    // Nama kegiatan muncul baik di desktop maupun mobile
    expect(screen.getAllByText('Kajian Subuh Berjamaah').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tahsin & Tahfidz Al-Quran').length).toBeGreaterThan(0)

    // Dots indicator di mobile
    const dot1 = screen.getByRole('button', { name: /Lihat kegiatan 1/i })
    const dot2 = screen.getByRole('button', { name: /Lihat kegiatan 2/i })
    expect(dot1).toBeInTheDocument()
    expect(dot2).toBeInTheDocument()
  })

  it('dapat berpindah tab ke Pengumuman & Berita dan kembali lagi ke Jadwal Rutin', () => {
    render(
      <PengumumanSectionTabs
        sectionTitle="Pengumuman & Agenda Masjid"
        sectionText="Informasi kegiatan pekanan dan kabar terkini masjid."
        kegiatanRutinList={MOCK_KEGIATAN}
        articles={MOCK_ARTICLES}
      />
    )

    const beritaTab = screen.getByRole('button', { name: /Pengumuman & Berita/i })
    fireEvent.click(beritaTab)

    expect(screen.getByText('Penyaluran Santunan Anak Yatim')).toBeInTheDocument()

    const jadwalTab = screen.getByRole('button', { name: /Jadwal Rutin/i })
    fireEvent.click(jadwalTab)

    expect(screen.getAllByText('Kajian Subuh Berjamaah').length).toBeGreaterThan(0)
  })
})

