import { describe, expect, it } from 'vitest'
import type { NavItem } from '@/components/admin/nav'
import { visibleAdminNav } from '@/components/admin/nav'

function hrefs(items: NavItem[]): string[] {
  return items.flatMap((item) =>
    item.children ? item.children.map((child) => child.href) : [item.href ?? ''],
  )
}

function labels(items: NavItem[]): string[] {
  return items.map((item) => item.label)
}

describe('visibleAdminNav (urutan & reposisi menu)', () => {
  it('ADMIN: Analitik tepat di bawah Ringkasan', () => {
    const items = visibleAdminNav('ADMIN')
    expect(labels(items).slice(0, 2)).toEqual(['Ringkasan', 'Analitik'])
    expect(hrefs(items)).toContain('/admin/analitik')
  })

  it('ADMIN: Sections pindah ke grup Pengaturan (Umum + Sections)', () => {
    const items = visibleAdminNav('ADMIN')
    // tidak ada link Sections level atas
    expect(items.some((item) => item.href === '/admin/sections')).toBe(false)

    const pengaturan = items.find((item) => item.label === 'Pengaturan')
    expect(pengaturan?.children?.map((child) => child.label)).toEqual([
      'Umum',
      'Sections',
    ])
    expect(hrefs(items)).toEqual(
      expect.arrayContaining(['/admin/pengaturan', '/admin/sections']),
    )
  })

  it('KONTEN: punya Sections di grup Pengaturan tanpa akses ke Pengaturan Umum', () => {
    const items = visibleAdminNav('KONTEN')
    const pengaturan = items.find((item) => item.label === 'Pengaturan')
    expect(pengaturan?.children?.map((child) => child.href)).toEqual([
      '/admin/sections',
    ])
    expect(hrefs(items)).not.toContain('/admin/pengaturan')
    expect(labels(items)).toContain('Artikel')
    expect(hrefs(items)).toContain('/admin/galeri')
    expect(labels(items)).not.toContain('Kas')
  })

  it('BENDAHARA: Analitik tampil, grup Pengaturan & Sections hilang', () => {
    const items = visibleAdminNav('BENDAHARA')
    expect(hrefs(items)).toContain('/admin/analitik')
    expect(labels(items)).not.toContain('Pengaturan')
    expect(hrefs(items)).not.toContain('/admin/sections')
    expect(labels(items)).toContain('Kas')
  })

  it('VIEWER: hanya Ringkasan + Analitik', () => {
    expect(labels(visibleAdminNav('VIEWER'))).toEqual(['Ringkasan', 'Analitik'])
  })
})
