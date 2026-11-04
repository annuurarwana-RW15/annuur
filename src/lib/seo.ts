import type { Metadata } from 'next'

export const DEFAULT_SITE_NAME = 'Masjid An-nuur Arwana'
export const DEFAULT_DESCRIPTION = 'Website resmi Masjid An-nuur Arwana'

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

export interface SiteMetadataInput {
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  seoOgImage?: string | null
  seoAuthor?: string | null
  seoRobots?: string | null
  favicon?: string | null
  siteName?: string | null
  webmasterGoogle?: string | null
  webmasterBing?: string | null
  webmasterYandex?: string | null
}

/**
 * Membersihkan token verifikasi webmaster jika pengguna menempelkan tag HTML utuh
 * (misal `<meta name="google-site-verification" content="XYZ" />`).
 */
export function cleanVerificationCode(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const str = raw.trim()
  if (!str) return undefined

  // Cek apakah berupa tag <meta ... content="..." />
  const contentMatch = str.match(/content=["']([^"']+)["']/i)
  if (contentMatch?.[1]) return contentMatch[1].trim()

  // Cek apakah berupa value="..."
  const valueMatch = str.match(/value=["']([^"']+)["']/i)
  if (valueMatch?.[1]) return valueMatch[1].trim()

  return str
}

export function parseKeywords(raw?: string | null): string[] | undefined {
  if (!raw) return undefined
  const items = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

function siteTitle({ seoTitle, siteName }: SiteMetadataInput): string {
  return seoTitle?.trim() || siteName?.trim() || DEFAULT_SITE_NAME
}

function siteDescription({ seoDescription }: SiteMetadataInput): string {
  return seoDescription?.trim() || DEFAULT_DESCRIPTION
}

function resolveIcons(favicon?: string | null): Metadata['icons'] {
  const iconUrl = favicon?.trim()
  if (!iconUrl) {
    return {
      icon: [{ url: '/favicon.ico' }],
    }
  }
  return {
    icon: [{ url: iconUrl }],
    shortcut: [{ url: iconUrl }],
    apple: [{ url: iconUrl }],
  }
}

function resolveVerification(input: SiteMetadataInput): Metadata['verification'] {
  const google = cleanVerificationCode(input.webmasterGoogle)
  const bing = cleanVerificationCode(input.webmasterBing)
  const yandex = cleanVerificationCode(input.webmasterYandex)

  if (!google && !bing && !yandex) return undefined

  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
    ...(bing ? { other: { 'msvalidate.01': [bing] } } : {}),
  }
}

function resolveRobots(seoRobots?: string | null): Metadata['robots'] {
  const isNoIndex = seoRobots?.trim().toLowerCase() === 'noindex'
  if (isNoIndex) {
    return {
      index: false,
      follow: false,
    }
  }
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
}

/**
 * Metadata layout root (di luar route group `(public)`): judul berupa string
 * polos **tanpa** `title.template` — halaman admin menyetel judulnya sendiri
 * sebagai string biasa, sehingga template justru menggandakan nama situs.
 *
 * Sumbernya Setting `seo.title` / `seo.description` lewat `generateMetadata`.
 */
export function buildRootMetadata(input: SiteMetadataInput = {}): Metadata {
  const verification = resolveVerification(input)
  return {
    metadataBase: new URL(SITE_URL),
    title: siteTitle(input),
    description: siteDescription(input),
    icons: resolveIcons(input.favicon),
    ...(verification ? { verification } : {}),
  }
}

/**
 * Metadata untuk layout `(public)` — permukaan SEO yang sesungguhnya.
 *
 * Bentuknya berbeda dari `buildRootMetadata`: `default` + `template` membuat
 * halaman berjudul polos ("Profil", "Kontak", "Galeri", …) ikut menyandang
 * nama situs, sedangkan halaman yang memakai `buildMetadata` lolos dari
 * template karena `title.absolute`.
 */
export function buildPublicMetadata(input: SiteMetadataInput = {}): Metadata {
  const name = siteTitle(input)
  const desc = siteDescription(input)
  const keywords = parseKeywords(input.seoKeywords)
  const authorName = input.seoAuthor?.trim() || name
  const ogImg = input.seoOgImage?.trim() ? absoluteUrl(input.seoOgImage.trim()) : undefined
  const verification = resolveVerification(input)

  return {
    title: { default: name, template: `%s — ${name}` },
    description: desc,
    ...(keywords ? { keywords } : {}),
    authors: [{ name: authorName }],
    creator: authorName,
    publisher: name,
    icons: resolveIcons(input.favicon),
    robots: resolveRobots(input.seoRobots),
    ...(verification ? { verification } : {}),
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: SITE_URL,
      siteName: name,
      title: name,
      description: desc,
      ...(ogImg ? { images: [{ url: ogImg, width: 1200, height: 630, alt: name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description: desc,
      ...(ogImg ? { images: [ogImg] } : {}),
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
