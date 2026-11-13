import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DonationSection } from '@/components/public/DonationSection'

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DonationSection', () => {
  const dummyRekening = [
    { bank: 'BSI', no: '7123456789', atasNama: 'Masjid An-nuur Arwana' },
    { bank: 'BCA', no: '8899001122', atasNama: 'DKM An-nuur' },
  ]

  it('merender hadits ajakan sedekah dan keutamaan amal jariyah', () => {
    render(<DonationSection qris={null} rekening={dummyRekening} />)

    expect(screen.getByText(/Salurkan Infaq & Sedekah Terbaik Anda/i)).toBeInTheDocument()
    expect(screen.getByText(/HR\. Muslim No\. 2588/i)).toBeInTheDocument()
    expect(screen.getByText(/Sedekah itu tidak akan pernah mengurangi harta/i)).toBeInTheDocument()
    expect(screen.getByText(/Keutamaan Amal Jariyah/i)).toBeInTheDocument()
  })

  it('merender daftar rekening transfer dengan tombol salin', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    })

    render(<DonationSection qris={null} rekening={dummyRekening} />)

    expect(screen.getByText('7123456789')).toBeInTheDocument()
    expect(screen.getByText('8899001122')).toBeInTheDocument()

    const copyButtons = screen.getAllByRole('button', { name: /salin rekening/i })
    expect(copyButtons.length).toBe(2)

    fireEvent.click(copyButtons[0])
    expect(writeTextMock).toHaveBeenCalledWith('7123456789')
  })

  it('saat QRIS tersedia: menampilkan gambar QRIS, tombol perbesar, dan tombol unduh', () => {
    const qrisData = {
      image: '/uploads/qris-masjid.png',
      caption: 'NMID: ID1020304050607',
    }

    render(<DonationSection qris={qrisData} rekening={dummyRekening} />)

    const qrisImg = screen.getByAltText(/Kode QRIS Donasi Masjid/i)
    expect(qrisImg).toBeInTheDocument()
    expect(qrisImg).toHaveAttribute('src', '/uploads/qris-masjid.png')
    expect(screen.getByText('NMID: ID1020304050607')).toBeInTheDocument()

    const zoomButtons = screen.getAllByRole('button', { name: /perbesar/i })
    expect(zoomButtons.length).toBeGreaterThan(0)

    const downloadLink = screen.getByRole('link', { name: /unduh qris/i })
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('href', '/uploads/qris-masjid.png')
  })

  it('membuka dan menutup modal lightbox QRIS saat tombol perbesar diklik', () => {
    const qrisData = {
      image: '/uploads/qris-masjid.png',
      caption: 'Masjid An-nuur Arwana',
    }

    render(<DonationSection qris={qrisData} rekening={dummyRekening} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const zoomButton = screen.getAllByRole('button', { name: /perbesar/i })[0]
    fireEvent.click(zoomButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText(/Kode QRIS Donasi Fullsize/i)).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /^tutup$/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('saat QRIS kosong: menampilkan kartu placeholder dan petunjuk upload admin', () => {
    render(<DonationSection qris={null} rekening={dummyRekening} />)

    expect(screen.getByText(/Kode QRIS Sedang Disiapkan/i)).toBeInTheDocument()
    const uploadLink = screen.getByRole('link', { name: /atur & upload qris di dashboard/i })
    expect(uploadLink).toBeInTheDocument()
    expect(uploadLink).toHaveAttribute('href', '/admin/pengaturan#qris')
  })

  it('merender tombol navigasi donasi, cek status, dan laporan kas', () => {
    render(<DonationSection qris={null} rekening={dummyRekening} />)

    expect(screen.getByRole('link', { name: /konfirmasi bukti transfer/i })).toHaveAttribute(
      'href',
      '/donasi',
    )
    expect(screen.getByRole('link', { name: /cek status donasi/i })).toHaveAttribute(
      'href',
      '/donasi/status',
    )
    expect(screen.getByRole('link', { name: /transparansi kas/i })).toHaveAttribute(
      'href',
      '/laporan-kas',
    )
  })
})
