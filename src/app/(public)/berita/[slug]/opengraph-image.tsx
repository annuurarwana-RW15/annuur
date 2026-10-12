import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { DEFAULT_SITE_NAME, SITE_URL } from '@/lib/seo'
import { asText } from '@/components/public/content'
import { OgFrame } from '@/components/public/OgFrame'

export const alt = 'Berita & Artikel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

function truncate(text: string, max: number): string {
  const chars = [...text]
  return chars.length > max
    ? `${chars.slice(0, max).join('').trimEnd()}…`
    : text
}

function siteHost(): string {
  try {
    return new URL(SITE_URL).host
  } catch {
    return ''
  }
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [article, siteNameRaw] = await Promise.all([
    db.article.findUnique({
      where: { slug },
      select: { title: true, status: true },
    }),
    getSetting('site.name', DEFAULT_SITE_NAME),
  ])
  const siteName = asText(siteNameRaw, DEFAULT_SITE_NAME)
  const title =
    article && article.status === 'PUBLISHED' ? article.title : siteName

  return new ImageResponse(
    <OgFrame
      eyebrow={siteName}
      title={truncate(title, 80)}
      subtitle={siteHost()}
    />,
    size,
  )
}
