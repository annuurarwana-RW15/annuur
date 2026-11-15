// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PengaturanForm } from '@/app/admin/(dashboard)/pengaturan/PengaturanForm'
import type { PengaturanInput } from '@/app/admin/(dashboard)/pengaturan/actions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

const MOCK_INITIAL: PengaturanInput = {
  site: {
    name: 'Masjid An-nuur Arwana',
    address: 'Jl. Raya Arwana No. 15',
    phone: '081234567890',
    city: 'Karawang',
    favicon: 'https://cdn.example.com/favicon.png',
    logo: 'https://cdn.example.com/logo-masjid.png',
  },
  seo: {
    title: 'Masjid An-nuur',
    description: 'Pusat Ibadah & Dakwah',
    keywords: 'masjid, arwana',
  },
  donasi: {
    rekening: [],
    qris: { image: '', caption: '' },
  },
  ga4: { id: '' },
}

afterEach(() => {
  cleanup()
})

describe('PengaturanForm — Favicon & Logo Upload Fields', () => {
  it('merender field favicon dan field logo di bawahnya dengan preview', () => {
    render(<PengaturanForm initial={MOCK_INITIAL} />)

    // Field Favicon
    expect(screen.getByText('Favicon Website')).toBeInTheDocument()
    expect(screen.getByText('Unggah Favicon')).toBeInTheDocument()
    expect(screen.getByAltText('Favicon preview')).toHaveAttribute(
      'src',
      'https://cdn.example.com/favicon.png',
    )

    // Field Logo Resmi di bawah Favicon
    expect(screen.getByText('Logo Resmi Masjid')).toBeInTheDocument()
    expect(screen.getByText('Unggah Logo')).toBeInTheDocument()
    expect(screen.getByAltText('Logo preview')).toHaveAttribute(
      'src',
      'https://cdn.example.com/logo-masjid.png',
    )
    expect(screen.getByText('Pratinjau Header Navbar:')).toBeInTheDocument()
  })

  it('urutan DOM: field logo muncul setelah field favicon', () => {
    render(<PengaturanForm initial={MOCK_INITIAL} />)

    const faviconHeading = screen.getByText('Favicon Website')
    const logoHeading = screen.getByText('Logo Resmi Masjid')

    // Periksa apakah logoHeading berada setelah faviconHeading di dalam dokumen
    expect(
      faviconHeading.compareDocumentPosition(logoHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
