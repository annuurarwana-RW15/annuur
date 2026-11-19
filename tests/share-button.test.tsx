import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ShareButton } from '@/components/public/ShareButton'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ShareButton', () => {
  it('merender tombol share dalam mode dropdown dan membuka menu platform saat diklik', () => {
    render(
      <ShareButton
        title="Kegiatan Pengajian Akbar"
        text="Ahad pagi di Masjid An-Nuur"
        url="/kegiatan"
        variant="dropdown"
      />,
    )

    const triggerBtn = screen.getByRole('button', { name: /Bagikan Kegiatan Pengajian Akbar/i })
    expect(triggerBtn).toBeInTheDocument()

    // Buka dropdown
    fireEvent.click(triggerBtn)

    expect(screen.getByRole('menu', { name: /Pilihan bagikan/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('api.whatsapp.com'),
    )
    expect(screen.getByRole('link', { name: /Telegram/i })).toHaveAttribute(
      'href',
      expect.stringContaining('t.me/share'),
    )
    expect(screen.getByRole('link', { name: /Facebook/i })).toHaveAttribute(
      'href',
      expect.stringContaining('facebook.com/sharer'),
    )
    expect(screen.getByRole('link', { name: /X/i })).toHaveAttribute(
      'href',
      expect.stringContaining('x.com/intent/tweet'),
    )
    expect(screen.getByRole('button', { name: /Salin Tautan/i })).toBeInTheDocument()
  })

  it('merender mode inline dengan deretan tombol platform lengkap', () => {
    render(
      <ShareButton
        title="Proposal Pembangunan Menara"
        text="Target dana 50 juta"
        url="/proposal/menara"
        variant="inline"
        label="Ajak Donasi"
      />,
    )

    expect(screen.getByText(/Ajak Donasi:/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Bagikan ke WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Bagikan ke Telegram/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Bagikan ke Facebook/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Bagikan ke X/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Salin tautan ke clipboard/i)).toBeInTheDocument()
  })

  it('menangani tombol salin tautan dengan feedback tersalin', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ShareButton
        title="Artikel Masjid"
        url="/berita/shalat-berjamaah"
        variant="inline"
      />,
    )

    const copyBtn = screen.getByRole('button', { name: /Salin Link/i })
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalled()
    expect(await screen.findByText('✓ Tersalin!')).toBeInTheDocument()
  })
})

