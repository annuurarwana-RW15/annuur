import type { Metadata } from 'next'

export const DEFAULT_SITE_NAME = 'Masjid An-nuur Arwana'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')

/** URL absolut dari path relatif; path absolut http(s) dilewatkan apa adanya. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export interface BuildMetadataInput {
  title?: string | null
  description?: string | null
  image?: string | null
  path: string
  type?: 'website' | 'article'
  siteName: string
}

export function buildMetadata({
  title,
  description,
  image,
  path,
  type = 'website',
  siteName,
}: BuildMetadataInput): Metadata {
  const name = siteName.trim() || DEFAULT_SITE_NAME
  const trimmedTitle = title?.trim()
  // `absolute` agar template judul layout tidak menggandakan nama situs.
  const fullTitle = trimmedTitle ? `${trimmedTitle} | ${name}` : name
  const desc = description?.trim() || undefined
  const img = image?.trim() || undefined
  const url = absoluteUrl(path)

  return {
    title: { absolute: fullTitle },
    ...(desc ? { description: desc } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: name,
      title: fullTitle,
      ...(desc ? { description: desc } : {}),
      ...(img ? { images: [{ url: img }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      ...(desc ? { description: desc } : {}),
      ...(img ? { images: [img] } : {}),
    },
  }
}

export interface ArticleLdInput {
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  seoImage?: string | null
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
}

function toIso(value?: Date | string | null): string | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function articleLd(
  article: ArticleLdInput,
  authorName: string,
  siteName: string = DEFAULT_SITE_NAME,
): Record<string, unknown> {
  const datePublished = toIso(article.publishedAt)
  const dateModified = toIso(article.updatedAt) ?? datePublished
  const image = article.seoImage?.trim() || article.coverImage?.trim() || undefined
  const description = article.excerpt?.trim() || undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    mainEntityOfPage: absoluteUrl(`/berita/${article.slug}`),
    author: { '@type': 'Person', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: siteName.trim() || DEFAULT_SITE_NAME,
    },
  }
}

export interface OrgLdInput {
  name: string
  address: string
  phone?: string
  url?: string
}

/** `Mosque` hanya bila identitas lengkap (nama + alamat); selain itu `Organization`. */
export function orgLd(site: OrgLdInput): Record<string, unknown> {
  const name = site.name.trim() || DEFAULT_SITE_NAME
  const address = site.address.trim()
  const phone = site.phone?.trim() || undefined

  return {
    '@context': 'https://schema.org',
    '@type': name && address ? 'Mosque' : 'Organization',
    name,
    ...(address
      ? { address: { '@type': 'PostalAddress', streetAddress: address } }
      : {}),
    ...(phone ? { telephone: phone } : {}),
    url: site.url ? absoluteUrl(site.url) : SITE_URL,
  }
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export function breadcrumbLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }
}

/**
 * JSON.stringify + escape `<` — mencegah `</script>` di dalam konten artikel
 * menutup tag <script type="application/ld+json">.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
