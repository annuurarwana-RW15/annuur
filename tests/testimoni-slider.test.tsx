// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

describe('TestimoniSection — Desktop Auto Rolling & Mobile Zoom In', () => {
  it('merender judul dan track auto rolling & looping untuk desktop', () => {
    render(<TestimoniSection section={MOCK_SECTION} />)

    expect(screen.getByText('Testimoni Jamaah')).toBeInTheDocument()

    // Testimoni terdaftar
    expect(screen.getAllByText('Ahmad Fauzi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('H. Ridwan').length).toBeGreaterThan(0)

    // Indikator auto rolling & looping aktif
    expect(screen.getByText(/Auto Rolling & Looping/i)).toBeInTheDocument()

    // Tombol kontrol jeda / lanjutkan
    const pauseBtn = screen.getByRole('button', { name: /Jeda auto rolling testimoni/i })
    expect(pauseBtn).toBeInTheDocument()
  })

  it('dapat menjeda dan melanjutkan auto rolling dengan tombol kontrol', () => {
    render(<TestimoniSection section={MOCK_SECTION} />)

    const pauseBtn = screen.getByRole('button', { name: /Jeda auto rolling testimoni/i })
    fireEvent.click(pauseBtn)

    // Tombol berubah menjadi lanjutkan
    const resumeBtn = screen.getByRole('button', { name: /Lanjutkan auto rolling testimoni/i })
    expect(resumeBtn).toBeInTheDocument()

    fireEvent.click(resumeBtn)
    expect(screen.getByRole('button', { name: /Jeda auto rolling testimoni/i })).toBeInTheDocument()
  })

  it('tampilan mobile merender card dengan animasi animate-zoom-in dan navigasi bergantian', () => {
    render(<TestimoniSection section={MOCK_SECTION} />)

    // Card mobile pertama aktif
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    const activeArticle = screen.getByText('1 / 5').closest('article')
    expect(activeArticle?.className).toContain('animate-zoom-in')

    // Tekan tombol next mobile -> card kedua aktif dengan badge 2 / 5
    const nextMobile = screen.getByRole('button', { name: /^Testimoni berikutnya$/i })
    fireEvent.click(nextMobile)

    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    const secondArticle = screen.getByText('2 / 5').closest('article')
    expect(secondArticle?.className).toContain('animate-zoom-in')
    expect(secondArticle?.textContent).toContain('Siti Rahma')
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
