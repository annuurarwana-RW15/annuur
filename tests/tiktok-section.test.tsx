import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Section } from '@prisma/client'
import { TikTokSection } from '@/components/public/TikTokSection'
import { TikTokWidget } from '@/components/public/TikTokWidget'

describe('TikTokSection', () => {
  it('merender heading section, badge official, dan tautan profil TikTok', () => {
    const mockSection: Section = {
      id: 'sec-tiktok',
      key: 'tiktok',
      title: 'Feed TikTok Official DKM',
      isVisible: true,
      order: 6,
      updatedAt: new Date(),
      content: {
        username: '@masjidannuurarwana',
        accountUrl: 'https://www.tiktok.com/@masjidannuurarwana',
        title: 'Dakwah singkat dan video kegiatan masjid.',
        videoId: '',
      },
    }

    render(<TikTokSection section={mockSection} />)

    expect(screen.getByText('Feed TikTok Official DKM')).toBeInTheDocument()
    expect(screen.getAllByText('@masjidannuurarwana').length).toBeGreaterThan(0)
    expect(screen.getByText('Official')).toBeInTheDocument()
    expect(screen.getByText('Dakwah singkat dan video kegiatan masjid.')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Kunjungi @masjidannuurarwana/i })
    expect(link).toHaveAttribute('href', 'https://www.tiktok.com/@masjidannuurarwana')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('TikTokWidget', () => {
  it('membersihkan format username dan menghasilkan blockquote kreator saat videoId kosong', () => {
    const { container } = render(
      <TikTokWidget
        username="@masjidannuur"
        accountUrl="https://www.tiktok.com/@masjidannuur"
        description="Kajian dan info"
      />,
    )

    const blockquote = container.querySelector('blockquote.tiktok-embed')
    expect(blockquote).toBeInTheDocument()
    expect(blockquote).toHaveAttribute('data-unique-id', 'masjidannuur')
    expect(blockquote).toHaveAttribute('data-embed-type', 'creator')
  })

  it('menyematkan data-video-id saat videoId disediakan', () => {
    const { container } = render(
      <TikTokWidget
        username="masjidannuur"
        videoId="7123456789012345678"
      />,
    )

    const blockquote = container.querySelector('blockquote.tiktok-embed')
    expect(blockquote).toBeInTheDocument()
    expect(blockquote).toHaveAttribute('data-video-id', '7123456789012345678')
  })
})
