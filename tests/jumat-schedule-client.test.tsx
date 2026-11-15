// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { JumatScheduleClient } from '@/components/public/JumatScheduleClient'
import type { JumatRow } from '@/app/admin/(dashboard)/sections/jumat-items'

const MOCK_JUMAT_ITEMS: JumatRow[] = [
  { tanggal: '2026-11-20', khatib: 'Ust. Habib Ikhsan', imam: 'Ust. Habib Ikhsan' },
  { tanggal: '2026-11-27', khatib: 'Drs. H. M. Syarif', imam: 'Ust. Rahmat Hidayat' },
  { tanggal: '2026-12-04', khatib: 'K.H. Ahmad Dahlan', imam: 'Ust. M. Ridwan' },
  { tanggal: '2026-12-11', khatib: 'Prof. Dr. Hamka', imam: 'Ust. Zulkifli' },
]

afterEach(() => {
  cleanup()
})

describe('JumatScheduleClient — Desktop Grid & Mobile Auto Slide (2 Cards) Looping', () => {
  it('merender daftar khotib dan jadwal Jumat untuk desktop dan mobile', () => {
    render(<JumatScheduleClient items={MOCK_JUMAT_ITEMS} />)

    // Khotib terdaftar di dokumen
    expect(screen.getAllByText('Ust. Habib Ikhsan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Drs. H. M. Syarif').length).toBeGreaterThan(0)

    // Badge Auto Slide di mobile
    expect(screen.getByText('Auto Slide (2 Jadwal)')).toBeInTheDocument()

    // Tombol kontrol navigasi mobile
    const nextBtn = screen.getByRole('button', { name: /Jadwal Jumat berikutnya/i })
    const prevBtn = screen.getByRole('button', { name: /Jadwal Jumat sebelumnya/i })
    expect(nextBtn).toBeInTheDocument()
    expect(prevBtn).toBeInTheDocument()

    // Indikator dots looping
    const dot1 = screen.getByRole('button', { name: /Lihat jadwal Jumat ke-1/i })
    expect(dot1).toBeInTheDocument()
  })

  it('dapat melakukan navigasi manual slide berikutnya dan sebelumnya', () => {
    render(<JumatScheduleClient items={MOCK_JUMAT_ITEMS} />)

    const nextBtn = screen.getByRole('button', { name: /Jadwal Jumat berikutnya/i })
    fireEvent.click(nextBtn)

    // Dot kedua aktif
    const dot2 = screen.getByRole('button', { name: /Lihat jadwal Jumat ke-2/i })
    expect(dot2.className).toContain('bg-emas-tua')

    const prevBtn = screen.getByRole('button', { name: /Jadwal Jumat sebelumnya/i })
    fireEvent.click(prevBtn)

    const dot1 = screen.getByRole('button', { name: /Lihat jadwal Jumat ke-1/i })
    expect(dot1.className).toContain('bg-emas-tua')
  })

  it('menampilkan fallback teks jika daftar jadwal kosong', () => {
    render(<JumatScheduleClient items={[]} />)
    expect(screen.getByText('Jadwal khotib sedang disiapkan.')).toBeInTheDocument()
  })
})
