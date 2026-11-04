import { describe, expect, it, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  sectionAggregateMock: vi.fn(),
  articleFindManyMock: vi.fn(),
  getSettingMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    section: { aggregate: h.sectionAggregateMock },
    article: { findMany: h.articleFindManyMock },
  },
}))

vi.mock('@/lib/settings', () => ({
  getSetting: h.getSettingMock,
}))

import sitemap from '@/app/sitemap'
import robots from '@/app/robots'

beforeEach(() => {
  vi.clearAllMocks()
  h.sectionAggregateMock.mockResolvedValue({ _max: { updatedAt: new Date('2026-01-01') } })
  h.articleFindManyMock.mockResolvedValue([
    { slug: 'kajian-akbar-ramadhan', updatedAt: new Date('2026-03-01') },
  ])
  h.getSettingMock.mockResolvedValue('index')
})

describe('sitemap', () => {
  it('menghasilkan URL statis, artikel dinamis, dan 114 surah Al-Qur\'an', async () => {
    const items = await sitemap()

    expect(items.length).toBeGreaterThan(120) // 11 statis + 1 artikel + 114 surah = 126

    const urls = items.map((i) => i.url)

    // Cek halaman publik utama
    expect(urls).toContain('http://localhost:3000/')
    expect(urls).toContain('http://localhost:3000/berita')
    expect(urls).toContain('http://localhost:3000/quran')
    expect(urls).toContain('http://localhost:3000/laporan-kas')
    expect(urls).toContain('http://localhost:3000/donasi')
    expect(urls).toContain('http://localhost:3000/kontak')

    // Cek artikel berita dinamis
    expect(urls).toContain('http://localhost:3000/berita/kajian-akbar-ramadhan')

    // Cek surah pertama dan terakhir
    expect(urls).toContain('http://localhost:3000/quran/1')
    expect(urls).toContain('http://localhost:3000/quran/114')
  })
})

describe('robots', () => {
  it('konfigurasi standar ramah Googlebot dan user-agent umum', async () => {
    const config = await robots()

    expect(Array.isArray(config.rules)).toBe(true)
    const rules = config.rules as Array<{
      userAgent: string | string[]
      allow?: string | string[]
      disallow?: string | string[]
    }>

    const googlebot = rules.find((r) => r.userAgent === 'Googlebot')
    expect(googlebot).toBeDefined()
    expect(googlebot?.allow).toContain('/_next/static/')
    expect(googlebot?.disallow).toContain('/admin/')
    expect(googlebot?.disallow).toContain('/api/')

    expect(config.sitemap).toBe('http://localhost:3000/sitemap.xml')
  })

  it('jika seo.robots diset "noindex", robots.txt memblokir seluruh perayapan', async () => {
    h.getSettingMock.mockResolvedValue('noindex')

    const config = await robots()
    expect(config.rules).toEqual({
      userAgent: '*',
      disallow: '/',
    })
  })
})
