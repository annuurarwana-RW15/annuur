import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MaintenanceView } from '@/components/public/MaintenanceView'

describe('MaintenanceView', () => {
  it('merender judul, pesan pemeliharaan, dan tautan kontak WA', () => {
    render(
      <MaintenanceView
        config={{
          enabled: true,
          title: 'Pemeliharaan Server Berkala',
          message: 'Mohon maaf situs sedang diperbaiki.',
          estimatedEnd: '16 November 2026 pukul 12.00 WIB',
        }}
        siteName="Masjid An-nuur Arwana"
        whatsapp="081234567890"
      />,
    )

    expect(screen.getByText('Pemeliharaan Server Berkala')).toBeInTheDocument()
    expect(screen.getByText('Mohon maaf situs sedang diperbaiki.')).toBeInTheDocument()
    expect(screen.getByText('16 November 2026 pukul 12.00 WIB')).toBeInTheDocument()
    expect(screen.getByText(/Sedang Dalam Pemeliharaan Sistem/i)).toBeInTheDocument()

    const waLink = screen.getByRole('link', { name: /Hubungi Pengurus via WA/i })
    expect(waLink).toHaveAttribute('href', expect.stringContaining('wa.me/081234567890'))

    const loginLink = screen.getByRole('link', { name: /Masuk Petugas \/ Admin/i })
    expect(loginLink).toHaveAttribute('href', '/admin/login')
  })
})
