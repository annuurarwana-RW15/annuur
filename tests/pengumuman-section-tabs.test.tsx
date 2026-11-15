// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PengumumanSectionTabs } from '@/components/public/PengumumanSectionTabs'
import type { KegiatanRutinItem } from '@/types/kegiatan-rutin'
import type { ArticleMeta } from '@/lib/articles'

const MOCK_KEGIATAN: KegiatanRutinItem[] = [
  {
    id: 'kegiatan-1',
    nama: 'Kajian Subuh Berjamaah',
    hari: 'ahad',
    waktu: 'Ba’da Subuh - 06.30 WIB',
    lokasi: 'Ruang Utama Masjid',
    pemateri: 'Ust. H. Ahmad Fauzi, Lc.',
    kategori: 'kajian_umum',
    deskripsi: 'Tafsir ayat-ayat pilihan.',
    isActive: true,
    urutan: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'kegiatan-2',
    nama: 'Tahsin & Tahfidz Al-Quran',
    hari: 'senin',
    waktu: 'Ba’da Maghrib - Isya',
    lokasi: 'Serambi Masjid',
    pemateri: 'Ustadz Pembina Tahfidz',
    kategori: 'tahsin_tahfidz',
    deskripsi: 'Bimbingan makhraj dan tajwid.',
    isActive: true,
    urutan: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const MOCK_ARTICLES: ArticleMeta[] = [
  {
    slug: 'berita-santunan-ramadhan',
    title: 'Penyaluran Santunan Anak Yatim',
    description: 'Dokumentasi penyaluran santunan.',
    date: '2026-11-10',
    category: 'Kegiatan Sosial',
    readTime: '3 menit',
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

    // Mobile slider badge dan kontrol jeda
    expect(screen.getByText('Auto Slide (1 Card)')).toBeInTheDocument()
    const pauseBtn = screen.getByRole('button', { name: /⏸ Jeda/i })
    expect(pauseBtn).toBeInTheDocument()

    // Toggle jeda
    fireEvent.click(pauseBtn)
    expect(screen.getByText('Jeda otomatis')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /▶ Putar/i })).toBeInTheDocument()

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
