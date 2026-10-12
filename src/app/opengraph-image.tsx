import { ImageResponse } from 'next/og'
import { getSetting } from '@/lib/settings'
import { DEFAULT_SITE_NAME, SITE_URL } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { OgFrame } from '@/components/public/OgFrame'

export const alt = DEFAULT_SITE_NAME
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

function siteHost(): string {
  try {
    return new URL(SITE_URL).host
  } catch {
    // NEXT_PUBLIC_SITE_URL tidak valid → tanpa subjudul domain
    return ''
  }
}

export default async function OpengraphImage() {
  const siteName = asText(
    await getSetting('site.name', DEFAULT_SITE_NAME),
    DEFAULT_SITE_NAME,
  )

  return new ImageResponse(
    <OgFrame eyebrow="Website Resmi" title={siteName} subtitle={siteHost()} />,
    size,
  )
}
