import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { getSetting } from '@/lib/settings'

export const revalidate = 3600

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seoRobots = await getSetting('seo.robots', 'index')
  const isNoIndex = String(seoRobots).trim().toLowerCase() === 'noindex'

  if (isNoIndex) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: `${SITE_URL}/sitemap.xml`,
    }
  }

  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/_next/static/',
          '/_next/image/',
          '/uploads/',
        ],
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
      {
        userAgent: '*',
        allow: [
          '/',
          '/_next/static/',
          '/_next/image/',
          '/uploads/',
        ],
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
