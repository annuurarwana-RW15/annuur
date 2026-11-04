import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  extractEmbedSrc,
  buildGoogleMapsEmbedUrl,
  mapHref,
  getDirectionsHref,
  GoogleMapEmbed,
} from '@/components/public/MapEmbed'
import { ContactSection } from '@/components/public/ContactSection'
import type { Section } from '@prisma/client'

afterEach(() => {
  cleanup()
})

describe('MapEmbed Utilities', () => {
  it('dapat mengekstrak src dari tag iframe Google Maps', () => {
    const iframeCode =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
    const result = extractEmbedSrc(iframeCode)
    expect(result).toBe('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345')
  })

  it('mengembalikan URL jika input sudah berupa URL embed Google Maps', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18'
    expect(extractEmbedSrc(url)).toBe(url)
  })

  it('mengembalikan null jika bukan tag iframe atau URL embed', () => {
    expect(extractEmbedSrc('https://maps.app.goo.gl/xyz123')).toBeNull()
    expect(extractEmbedSrc('Karawang, Jawa Barat')).toBeNull()
    expect(extractEmbedSrc('')).toBeNull()
  })

  it('membangun Google Maps embed URL dari teks alamat atau nama tempat', () => {
    const embedUrl = buildGoogleMapsEmbedUrl('Masjid An-nuur Arwana Karawang')
    expect(embedUrl).toContain('https://maps.google.com/maps?q=Masjid%20An-nuur%20Arwana%20Karawang')
    expect(embedUrl).toContain('output=embed')
  })

  it('menghasilkan mapHref yang valid', () => {
    // Jika directUrl tersedia
    expect(mapHref('Alamat', 'https://maps.app.goo.gl/share123')).toBe(
      'https://maps.app.goo.gl/share123',
    )
    // Jika hanya teks query
    expect(mapHref('Perum Arwana')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Perum%20Arwana',
    )
  })

  it('menghasilkan tautan petunjuk arah (directions)', () => {
    const dir = getDirectionsHref('Masjid An-nuur Arwana Karawang')
    expect(dir).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Masjid%20An-nuur%20Arwana%20Karawang',
    )
  })
})

describe('GoogleMapEmbed Component', () => {
  it('merender iframe peta dan tombol navigasi dengan benar', () => {
    render(
      <GoogleMapEmbed
        mapQuery="https://www.google.com/maps/embed?pb=test"
        mapUrl="https://maps.app.goo.gl/share123"
        alamat="Perumahan Arwana Blok B No. 15, Karawang"
      />,
    )

    // Iframe peta
    const iframe = screen.getByTitle(/Lokasi Masjid/i)
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'https://www.google.com/maps/embed?pb=test')

    // Tombol aksi
    const mapsLink = screen.getByRole('link', { name: /Buka di Google Maps/i })
    expect(mapsLink).toBeInTheDocument()
    expect(mapsLink).toHaveAttribute('href', 'https://maps.app.goo.gl/share123')

    const dirLink = screen.getByRole('link', { name: /Petunjuk Arah/i })
    expect(dirLink).toBeInTheDocument()
    expect(dirLink.getAttribute('href')).toContain('destination=Perumahan%20Arwana')
  })
})

describe('ContactSection Component', () => {
  const dummySection: Section = {
    id: 'sec-kontak-1',
    key: 'kontak',
    title: 'Kontak & Lokasi',
    order: 7,
    isVisible: true,
    content: {
      alamat: 'Perumahan Arwana Blok B, Karawang',
      telp: '081234567890',
      whatsapp: '081234567890',
      email: 'dkm@annuur-arwana.id',
      jam: 'Setiap Hari 04.00 - 21.00 WIB',
      mapUrl: 'https://maps.app.goo.gl/arwana',
      mapQuery: '<iframe src="https://www.google.com/maps/embed?pb=masjid"></iframe>',
    },
    updatedAt: new Date(),
  }

  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('merender seluruh detail informasi kontak dengan benar', () => {
    render(<ContactSection section={dummySection} headingAs="h1" />)

    // Judul
    expect(screen.getByRole('heading', { level: 1, name: /Kontak & Lokasi/i })).toBeInTheDocument()

    // Informasi Kontak
    expect(screen.getAllByText('Perumahan Arwana Blok B, Karawang').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('081234567890').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('dkm@annuur-arwana.id')).toBeInTheDocument()
    expect(screen.getByText('Setiap Hari 04.00 - 21.00 WIB')).toBeInTheDocument()

    // Tombol WhatsApp
    const waLink = screen.getByRole('link', { name: /Chat WhatsApp DKM/i })
    expect(waLink).toBeInTheDocument()
    expect(waLink).toHaveAttribute('href', expect.stringContaining('https://wa.me/6281234567890'))

    // Tombol Telepon
    const telLink = screen.getByRole('link', { name: '081234567890' })
    expect(telLink).toHaveAttribute('href', 'tel:081234567890')

    // Tombol Email
    const mailLink = screen.getByRole('link', { name: 'dkm@annuur-arwana.id' })
    expect(mailLink).toHaveAttribute('href', 'mailto:dkm@annuur-arwana.id')

    // Peta Google Maps
    const iframe = screen.getByTitle(/Peta Lokasi Kontak & Lokasi/i)
    expect(iframe).toHaveAttribute('src', 'https://www.google.com/maps/embed?pb=masjid')
  })

  it('dapat menyalin alamat ke clipboard saat tombol salin diklik', async () => {
    render(<ContactSection section={dummySection} />)

    const copyBtn = screen.getByRole('button', { name: /Salin Alamat/i })
    expect(copyBtn).toBeInTheDocument()

    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Perumahan Arwana Blok B, Karawang',
    )
    expect(await screen.findByText(/Alamat Tersalin/i)).toBeInTheDocument()
  })

  it('menggunakan data fallback jika field section kosong', () => {
    const emptySection: Section = {
      ...dummySection,
      content: {},
    }

    render(
      <ContactSection
        section={emptySection}
        fallbacks={{
          alamat: 'Alamat Fallback DKM',
          telp: '0899999999',
        }}
      />,
    )

    expect(screen.getAllByText('Alamat Fallback DKM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0899999999').length).toBeGreaterThanOrEqual(1)
  })
})
