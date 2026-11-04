import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { HijriCalendar } from '@/components/public/HijriCalendar'

describe('HijriCalendar', () => {
  afterEach(cleanup)

  it('merender judul kalender Hijriah dan nama-nama hari', () => {
    render(<HijriCalendar />)

    expect(screen.getByText('Kalender Tahun Hijriah')).toBeInTheDocument()
    expect(screen.getByText('Ahad')).toBeInTheDocument()
    expect(screen.getAllByText('Senin').length).toBeGreaterThan(0)
    expect(screen.getByText('Jumat')).toBeInTheDocument()
    expect(screen.getByText('Sabtu')).toBeInTheDocument()
  })

  it('dapat berpindah antara tab Kalender dan tab Agenda Islam', () => {
    render(<HijriCalendar />)

    const agendaTab = screen.getByRole('button', { name: /Agenda Islam/i })
    expect(agendaTab).toBeInTheDocument()

    fireEvent.click(agendaTab)

    expect(screen.getByText(/Agenda & Momentum Islam pada Bulan/i)).toBeInTheDocument()
    expect(screen.getByText(/Daftar Hari Besar Islam Tahun Ini/i)).toBeInTheDocument()

    const kalenderTab = screen.getByRole('button', { name: /^Kalender$/i })
    fireEvent.click(kalenderTab)

    expect(screen.getByText('Ahad')).toBeInTheDocument()
  })

  it('dapat berpindah bulan dengan tombol navigasi', () => {
    render(<HijriCalendar />)

    const prevBtn = screen.getByRole('button', { name: /Bulan sebelumnya/i })
    const nextBtn = screen.getByRole('button', { name: /Bulan berikutnya/i })

    expect(prevBtn).toBeInTheDocument()
    expect(nextBtn).toBeInTheDocument()

    fireEvent.click(nextBtn)
    fireEvent.click(prevBtn)
  })
})
