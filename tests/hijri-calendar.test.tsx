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

  it('mendukung gesture swipe di mobile view untuk berpindah bulan dengan animasi membuka lembaran', () => {
    const { container } = render(<HijriCalendar />)

    expect(screen.getByText(/Geser untuk buka lembar bulan/i)).toBeInTheDocument()

    const swipeContainer = container.querySelector('.touch-pan-y')
    expect(swipeContainer).toBeInTheDocument()

    if (swipeContainer) {
      // 1. Gesture swipe ke kiri (dragOffset negatif -> bulan berikutnya)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 130, clientY: 100 }],
      })
      fireEvent.touchEnd(swipeContainer)

      // Memastikan elemen lembaran kalender menerima animasi turn next
      const turnNextElem = container.querySelector('.animate-calendar-turn-next')
      expect(turnNextElem).toBeInTheDocument()

      // 2. Gesture swipe ke kanan (dragOffset positif -> bulan sebelumnya)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 180, clientY: 100 }],
      })
      fireEvent.touchEnd(swipeContainer)

      const turnPrevElem = container.querySelector('.animate-calendar-turn-prev')
      expect(turnPrevElem).toBeInTheDocument()
    }
  })
})
