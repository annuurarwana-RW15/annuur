// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { TestimoniSection } from '@/components/public/TestimoniSection'
import type { Section } from '@prisma/client'

const MOCK_SECTION: Section = {
  id: 'sec-testimoni',
  key: 'testimoni',
  title: 'Testimoni Jamaah',
  isVisible: true,
  order: 5,
  updatedAt: new Date(),
  content: {
    items: [
      { nama: 'Ahmad Fauzi', peran: 'Jamaah Tetap', teks: 'Masjid yang sangat nyaman dan makmur.', rating: 5 },
      { nama: 'Siti Rahma', peran: 'Warga RW 15', teks: 'Kajian dan program sosialnya sangat bermanfaat.', rating: 5 },
      { nama: 'Budi Santoso', peran: 'Musafir', teks: 'Fasilitas wudhu dan toilet sangat bersih.', rating: 4 },
      { nama: 'H. Ridwan', peran: 'Tokoh Masyarakat', teks: 'Transparansi laporan keuangannya patut dicontoh.', rating: 5 },
      { nama: 'Dewi Lestari', peran: 'Jamaah Pengajian', teks: 'Anak-anak senang belajar mengaji di sini.', rating: 5 },
    ],
  },
}

afterEach(() => {
  cleanup()
})

describe('TestimoniSection — Desktop Auto Rolling & Mobile Auto Slide Tanpa Tombol Navigasi', () => {
  it('merender judul dan track auto rolling & looping untuk desktop tanpa tombol navigasi/kontrol', () => {
    render(<TestimoniSection section={MOCK_SECTION} />)

    expect(screen.getByText('Testimoni Jamaah')).toBeInTheDocument()

    // Testimoni terdaftar
    expect(screen.getAllByText('Ahmad Fauzi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('H. Ridwan').length).toBeGreaterThan(0)

    // Tidak ada tombol jeda / lanjutkan maupun indikator badge
    expect(screen.queryByText(/Auto Rolling & Looping/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /auto rolling testimoni/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /testimoni/i })).not.toBeInTheDocument()
  })

  it('tampilan mobile merender card dengan animasi animate-zoom-in tanpa tombol navigasi panah', () => {
    render(<TestimoniSection section={MOCK_SECTION} />)

    // Card mobile pertama aktif
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    const activeArticle = screen.getByText('1 / 5').closest('article')
    expect(activeArticle?.className).toContain('animate-zoom-in')

    // Tidak ada tombol prev/next mobile
    expect(screen.queryByRole('button', { name: /^Testimoni berikutnya$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Testimoni sebelumnya$/i })).not.toBeInTheDocument()
  })

  it('menampilkan fallback teks jika belum ada testimoni', () => {
    const emptySection: Section = {
      ...MOCK_SECTION,
      content: { items: [] },
    }
    render(<TestimoniSection section={emptySection} />)
    expect(screen.getByText('Belum ada testimoni.')).toBeInTheDocument()
  })
})
