import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SITE_NAME,
  SITE_URL,
  articleLd,
  breadcrumbLd,
  buildMetadata,
  buildPublicMetadata,
  buildRootMetadata,
  jsonLd,
  orgLd,
} from '@/lib/seo'

const SITE_NAME = 'Masjid An-nuur Arwana'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('buildMetadata', () => {
  it('canonical, og:url, dan type default', () => {
    const md = buildMetadata({ title: 'Berita & Artikel', path: '/berita', siteName: SITE_NAME })

    expect(md.alternates?.canonical).toBe(`${SITE_URL}/berita`)
    expect(md.openGraph).toMatchObject({
      type: 'website',
      url: `${SITE_URL}/berita`,
      siteName: SITE_NAME,
    })
    expect(md.title).toEqual({ absolute: `Berita & Artikel | ${SITE_NAME}` })
    expect(md.openGraph?.title).toBe(`Berita & Artikel | ${SITE_NAME}`)
    expect(md.twitter?.title).toBe(`Berita & Artikel | ${SITE_NAME}`)
  })

  it('fallback: tanpa title judul jadi site name (dipakai og/twitter juga)', () => {
    const md = buildMetadata({ path: '/', siteName: SITE_NAME })

    expect(md.title).toEqual({ absolute: SITE_NAME })
    expect(md.openGraph?.title).toBe(SITE_NAME)
    expect(md.twitter?.title).toBe(SITE_NAME)
    expect(md.description).toBeUndefined()
    expect(md.openGraph?.description).toBeUndefined()
  })

  it('siteName kosong jatuh ke nama default masjid', () => {
    const md = buildMetadata({ title: 'Profil', path: '/profil', siteName: '   ' })

    expect(md.title).toEqual({ absolute: `Profil | ${SITE_NAME}` })
    expect(md.openGraph?.siteName).toBe(SITE_NAME)
  })

  it('description & image terbawa ke og dan twitter', () => {
    const md = buildMetadata({
      title: 'Judul',
      description: 'Ringkasan artikel',
      image: 'https://cdn.example/cover.jpg',
      path: '/berita/judul',
      type: 'article',
      siteName: SITE_NAME,
    })

    expect(md.description).toBe('Ringkasan artikel')
    expect(md.openGraph).toMatchObject({
      type: 'article',
      description: 'Ringkasan artikel',
      images: [{ url: 'https://cdn.example/cover.jpg' }],
    })
    expect(md.twitter).toMatchObject({
      card: 'summary_large_image',
      description: 'Ringkasan artikel',
      images: ['https://cdn.example/cover.jpg'],
    })
  })

  it('tanpa image: og.images & twitter.images kosong', () => {
    const md = buildMetadata({ title: 'Tanpa Gambar', path: '/berita/x', siteName: SITE_NAME })

    expect(md.openGraph?.images).toBeUndefined()
    expect(md.twitter?.images).toBeUndefined()
  })

  it('path relatif tetap absolut; path absolut tidak digandakan', () => {
    const relatif = buildMetadata({ path: 'berita', siteName: SITE_NAME })
    const absolut = buildMetadata({ path: 'https://cdn.example/p', siteName: SITE_NAME })

    expect(relatif.alternates?.canonical).toBe(`${SITE_URL}/berita`)
    expect(absolut.alternates?.canonical).toBe('https://cdn.example/p')
  })

  it('SITE_URL mengikuti NEXT_PUBLIC_SITE_URL dan trailing slash di-strip', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://contoh.example.id/')
    vi.resetModules()

    const fresh = await import('@/lib/seo')

    expect(fresh.SITE_URL).toBe('https://contoh.example.id')
    expect(
      fresh.buildMetadata({ path: '/berita', siteName: SITE_NAME }).alternates?.canonical,
    ).toBe('https://contoh.example.id/berita')
  })
})

describe('articleLd', () => {
  const article = {
    title: 'Pengajian Rutin Mingguan',
    slug: 'pengajian-rutin-mingguan',
    excerpt: 'Kegiatan pengajian setiap malam Jumat.',
    coverImage: 'https://cdn.example/cover.jpg',
    publishedAt: new Date('2026-01-15T08:00:00.000Z'),
    updatedAt: new Date('2026-01-16T09:30:00.000Z'),
  }

  it('memiliki field wajib Article + @context', () => {
    const ld = articleLd(article, 'Admin Konten')

    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Article')
    expect(ld.headline).toBe('Pengajian Rutin Mingguan')
    expect(ld.description).toBe('Kegiatan pengajian setiap malam Jumat.')
    expect(ld.image).toBe('https://cdn.example/cover.jpg')
    expect(ld.datePublished).toBe('2026-01-15T08:00:00.000Z')
    expect(ld.dateModified).toBe('2026-01-16T09:30:00.000Z')
    expect(ld.mainEntityOfPage).toBe(`${SITE_URL}/berita/pengajian-rutin-mingguan`)
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Admin Konten' })
    expect(ld.publisher).toMatchObject({
      '@type': 'Organization',
      name: SITE_NAME,
    })
  })

  it('dateModified jatuh ke datePublished; seoImage mengalahkan coverImage', () => {
    const ld = articleLd(
      {
        title: 'Judul',
        slug: 'judul',
        coverImage: 'https://cdn.example/cover.jpg',
        seoImage: 'https://cdn.example/seo.jpg',
        publishedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: null,
      },
      'Penulis',
    )

    expect(ld.dateModified).toBe('2026-02-01T00:00:00.000Z')
    expect(ld.image).toBe('https://cdn.example/seo.jpg')
  })

  it('tanpa publishedAt: datePublished/dateModified tidak ada', () => {
    const ld = articleLd({ title: 'Judul', slug: 'judul', publishedAt: null }, 'Penulis')

    expect(ld.datePublished).toBeUndefined()
    expect(ld.dateModified).toBeUndefined()
    expect(ld.headline).toBe('Judul')
  })
})

describe('jsonLd', () => {
  it('escape < sehingga </script> tidak menutup tag', () => {
    const script = jsonLd({ evil: '</script><script>alert(1)</script>' })

    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c/script>')
    expect(JSON.parse(script)).toEqual({
      evil: '</script><script>alert(1)</script>',
    })
  })

  it('hasil tetap JSON valid untuk objek bersarang', () => {
    const ld = breadcrumbLd([{ name: 'Beranda', url: '/' }])
    expect(JSON.parse(jsonLd(ld))).toEqual(ld)
  })
})

describe('breadcrumbLd', () => {
  it('bentuk BreadcrumbList berurutan dari posisi 1', () => {
    const ld = breadcrumbLd([
      { name: 'Beranda', url: '/' },
      { name: 'Berita', url: '/berita' },
      { name: 'Pengajian Rutin', url: '/berita/pengajian-rutin' },
    ])

    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Berita', item: `${SITE_URL}/berita` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Pengajian Rutin',
        item: `${SITE_URL}/berita/pengajian-rutin`,
      },
    ])
  })
})

describe('orgLd', () => {
  it('nama + alamat lengkap -> @type Mosque dengan PostalAddress', () => {
    const ld = orgLd({
      name: 'Masjid An-nuur Arwana',
      address: 'Jl. Raya Arwana No. 1',
      phone: '0812-3456-7890',
    })

    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Mosque')
    expect(ld.name).toBe('Masjid An-nuur Arwana')
    expect(ld.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Raya Arwana No. 1',
    })
    expect(ld.telephone).toBe('0812-3456-7890')
    expect(ld.url).toBe(SITE_URL)
  })

  it('alamat kosong -> @type Organization dan telephone ikut kosong', () => {
    const ld = orgLd({ name: 'Masjid An-nuur Arwana', address: '', phone: '' })

    expect(ld['@type']).toBe('Organization')
    expect(ld.address).toBeUndefined()
    expect(ld.telephone).toBeUndefined()
    expect(ld.name).toBe('Masjid An-nuur Arwana')
  })
})

describe('buildRootMetadata', () => {
  it('seo.title & seo.description terisi -> keduanya dipakai', () => {
    const md = buildRootMetadata({
      seoTitle: 'Judul SEO Global',
      seoDescription: 'Deskripsi SEO Global',
      siteName: 'Nama Situs',
    })

    expect(md.title).toBe('Judul SEO Global')
    expect(md.description).toBe('Deskripsi SEO Global')
    expect(md.metadataBase).toEqual(new URL(SITE_URL))
  })

  it('seo.title kosong / hanya spasi -> jatuh ke site.name (di-trim)', () => {
    expect(buildRootMetadata({ seoTitle: '   ', siteName: ' Nama Situs ' }).title).toBe(
      'Nama Situs',
    )
  })

  it('site.name juga kosong -> DEFAULT_SITE_NAME; tanpa argumen pun tetap ada judul', () => {
    expect(buildRootMetadata({ seoTitle: '', siteName: '' }).title).toBe(DEFAULT_SITE_NAME)
    expect(buildRootMetadata().title).toBe(DEFAULT_SITE_NAME)
  })

  it('seo.description kosong -> DEFAULT_DESCRIPTION (deskripsi tidak pernah undefined)', () => {
    expect(buildRootMetadata({ seoDescription: '  ' }).description).toBe(DEFAULT_DESCRIPTION)
    expect(buildRootMetadata().description).toBe(DEFAULT_DESCRIPTION)
  })
})

describe('buildPublicMetadata (layout (public))', () => {
  it('mempertahankan default + template, diisi dari seo.title & site.name', () => {
    const md = buildPublicMetadata({
      seoTitle: 'Judul SEO',
      siteName: 'Nama Situs',
      seoDescription: 'Deskripsi SEO',
    })

    expect(md.title).toEqual({
      default: 'Judul SEO',
      template: '%s — Judul SEO',
    })
    expect(md.description).toBe('Deskripsi SEO')
  })

  it('template dipakai halaman berjudul polos ("Kontak") -> "Kontak — <nama situs>"', () => {
    const md = buildPublicMetadata({ seoTitle: '', siteName: 'Masjid X' })
    const template = (md.title as { template?: string }).template

    expect(md.title).toEqual({
      default: 'Masjid X',
      template: '%s — Masjid X',
    })
    expect(template?.replace('%s', 'Kontak')).toBe('Kontak — Masjid X')
  })

  it('tanpa nilai tersimpan -> nama & deskripsi bawaan (bukan string kosong)', () => {
    const md = buildPublicMetadata()

    expect(md.title).toEqual({
      default: DEFAULT_SITE_NAME,
      template: `%s — ${DEFAULT_SITE_NAME}`,
    })
    expect(md.description).toBe(DEFAULT_DESCRIPTION)
  })

  it('beda dari buildRootMetadata: root tanpa template agar judul admin tak digandakan', () => {
    const input = { seoTitle: 'X', siteName: 'Y' }

    expect(buildRootMetadata(input).title).toBe('X')
    expect(buildPublicMetadata(input).title).toMatchObject({ default: 'X' })
  })
})
