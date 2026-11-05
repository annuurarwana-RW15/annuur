// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { GalleryGrid } from '@/components/public/GalleryGrid'
import type { GalleryItem } from '@/components/public/content'

const MOCK_ITEMS: GalleryItem[] = [
  { url: 'https://cdn.example.com/masjid-depan.jpg', caption: 'Tampak Depan Masjid' },
  { url: 'https://cdn.example.com/ruang-sholat.jpg', caption: 'Ruang Sholat Utama' },
  { url: 'https://cdn.example.com/menara.jpg', caption: 'Menara Masjid' },
]

afterEach(() => {
  cleanup()
})

describe('GalleryGrid — Zoom In, Zoom Out, Klik & Mobile Double Tap', () => {
  it('merender item galeri dengan overlay zoom dan caption', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    expect(screen.getByText('Tampak Depan Masjid')).toBeInTheDocument()
    expect(screen.getByText('Ruang Sholat Utama')).toBeInTheDocument()
    expect(screen.getByText('Menara Masjid')).toBeInTheDocument()

    // 3 item tombol pembuka foto
    const items = screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })
    expect(items).toHaveLength(3)
  })

  it('mengklik gambar membuka lightbox zoom viewer', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    const firstCard = screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })[0]
    fireEvent.click(firstCard)

    const dialog = screen.getByRole('dialog', { name: /Penampil Foto Galeri dengan Fitur Zoom/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument()
    expect(within(dialog).getByText('100%')).toBeInTheDocument()
  })

  it('mengklik gambar di lightbox memicu toggle zoom in (scale > 1) dan klik berikutnya zoom out (100%)', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    // Buka lightbox
    fireEvent.click(screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })[0])

    const dialog = screen.getByRole('dialog', { name: /Penampil Foto Galeri dengan Fitur Zoom/i })
    const imageEl = within(dialog).getByAltText('Tampak Depan Masjid')
    const containerEl = imageEl.parentElement!

    // Awal: 100% (scale 1)
    expect(containerEl.style.transform).toContain('scale(1)')
    expect(within(dialog).getByText('100%')).toBeInTheDocument()

    // Klik 1: Zoom In
    fireEvent.click(containerEl)
    expect(containerEl.style.transform).toContain('scale(2.2)')
    expect(within(dialog).getByText('220%')).toBeInTheDocument()

    // Klik 2: Zoom Out kembali ke 100%
    fireEvent.click(containerEl)
    expect(containerEl.style.transform).toContain('scale(1)')
    expect(within(dialog).getByText('100%')).toBeInTheDocument()
  })

  it('tombol zoom in (+) dan zoom out (-) di toolbar berfungsi', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })[0])
    const dialog = screen.getByRole('dialog', { name: /Penampil Foto Galeri dengan Fitur Zoom/i })

    const zoomInBtn = within(dialog).getByRole('button', { name: /Perbesar zoom/i })
    const zoomOutBtn = within(dialog).getByRole('button', { name: /Perkecil zoom/i })

    // Tekan Zoom In
    fireEvent.click(zoomInBtn)
    expect(within(dialog).getByText('150%')).toBeInTheDocument()

    fireEvent.click(zoomInBtn)
    expect(within(dialog).getByText('200%')).toBeInTheDocument()

    // Tekan Zoom Out
    fireEvent.click(zoomOutBtn)
    expect(within(dialog).getByText('150%')).toBeInTheDocument()
  })

  it('mobile view: ketukan layar 2 kali (double tap) memicu zoom in dan zoom out', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })[0])
    const dialog = screen.getByRole('dialog', { name: /Penampil Foto Galeri dengan Fitur Zoom/i })

    const imageEl = within(dialog).getByAltText('Tampak Depan Masjid')
    const containerEl = imageEl.parentElement!
    const touchArea = containerEl.parentElement!

    expect(within(dialog).getByText('100%')).toBeInTheDocument()

    // Tap 1
    fireEvent.touchStart(touchArea, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(touchArea, { changedTouches: [{ clientX: 100, clientY: 100 }] })

    // Tap 2 (dalam 100ms) -> Memicu DOUBLE TAP ZOOM IN
    fireEvent.touchStart(touchArea, { touches: [{ clientX: 102, clientY: 101 }] })
    fireEvent.touchEnd(touchArea, { changedTouches: [{ clientX: 102, clientY: 101 }] })

    expect(within(dialog).getByText('220%')).toBeInTheDocument()
    expect(containerEl.style.transform).toContain('scale(2.2)')

    // Double Tap lagi -> ZOOM OUT kembali ke 100%
    fireEvent.touchStart(touchArea, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(touchArea, { changedTouches: [{ clientX: 100, clientY: 100 }] })

    fireEvent.touchStart(touchArea, { touches: [{ clientX: 101, clientY: 100 }] })
    fireEvent.touchEnd(touchArea, { changedTouches: [{ clientX: 101, clientY: 100 }] })

    expect(within(dialog).getByText('100%')).toBeInTheDocument()
    expect(containerEl.style.transform).toContain('scale(1)')
  })

  it('navigasi next, prev, dan tombol close di lightbox', () => {
    render(<GalleryGrid items={MOCK_ITEMS} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Buka dan perbesar foto/i })[0])
    const dialog = screen.getByRole('dialog', { name: /Penampil Foto Galeri dengan Fitur Zoom/i })

    // Tekan Next -> Foto kedua
    const nextBtn = within(dialog).getByRole('button', { name: /Foto selanjutnya/i })
    fireEvent.click(nextBtn)
    expect(within(dialog).getByText('2 / 3')).toBeInTheDocument()

    // Tekan Prev -> Foto pertama
    const prevBtn = within(dialog).getByRole('button', { name: /Foto sebelumnya/i })
    fireEvent.click(prevBtn)
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument()

    // Tutup lightbox
    const closeBtn = within(dialog).getByRole('button', { name: /Tutup penampil gambar/i })
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
