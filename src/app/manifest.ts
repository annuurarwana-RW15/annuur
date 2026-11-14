import type { MetadataRoute } from 'next'
import { getSetting } from '@/lib/settings'
import { DEFAULT_DESCRIPTION, DEFAULT_SITE_NAME } from '@/lib/seo'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [siteName, seoDescription] = await Promise.all([
    getSetting('site.name', DEFAULT_SITE_NAME),
    getSetting('seo.description', DEFAULT_DESCRIPTION),
  ])

  const name = siteName.trim() || DEFAULT_SITE_NAME
  const description = seoDescription.trim() || DEFAULT_DESCRIPTION

  return {
    name,
    short_name: name,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#047857',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

