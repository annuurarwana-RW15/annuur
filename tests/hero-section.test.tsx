import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Section } from '@prisma/client'
import { Hero } from '@/components/public/Hero'

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

describe('Hero Section CTA', () => {
  const baseSection: Section = {
    id: 's-hero',
    key: 'hero',
    title: 'Masjid An-nuur Arwana',
    order: 1,
    isVisible: true,
    content: {
      subjudul: 'Pusat Ibadah dan Ukhuwah',
      ctaLabel: 'Donasi Sekarang',
      ctaHref: '/donasi',
    },
    updatedAt: new Date(),
  }

  it('mengganti tombol donasi bawaan menjadi Kontak dan mengarahkan ke nomor WhatsApp admin', () => {
    render(<Hero section={baseSection} whatsapp="081234567890" />)

    const kontakLink = screen.getByRole('link', { name: /kontak/i })
    expect(kontakLink).toBeInTheDocument()
    expect(kontakLink.getAttribute('href')).toContain('wa.me/6281234567890')
    expect(kontakLink).toHaveAttribute('target', '_blank')
  })

  it('bila nomor WhatsApp tidak tersedia, mengarahkan ke halaman /kontak', () => {
    render(<Hero section={baseSection} whatsapp="" />)

    const kontakLink = screen.getByRole('link', { name: /kontak/i })
    expect(kontakLink).toBeInTheDocument()
    expect(kontakLink).toHaveAttribute('href', '/kontak')
  })

  it('merender tombol navigasi sekunder Infaq & Donasi yang menuju #donasi', () => {
    render(<Hero section={baseSection} whatsapp="081234567890" />)

    const donasiAnchor = screen.getByRole('link', { name: /infaq & donasi/i })
    expect(donasiAnchor).toBeInTheDocument()
    expect(donasiAnchor).toHaveAttribute('href', '#donasi')
  })
})
