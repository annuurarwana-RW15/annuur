import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  articleFindFirstMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { article: { findFirst: h.articleFindFirstMock } },
}))

import { slugify, uniqueSlug } from '@/lib/slug'

describe('slugify', () => {
  it('slugify("Pengajian Rutin Mingguan!") === "pengajian-rutin-mingguan"', () => {
    expect(slugify('Pengajian Rutin Mingguan!')).toBe('pengajian-rutin-mingguan')
  })

  it('huruf besar jadi huruf kecil', () => {
    expect(slugify('IDUL ADHA 1447 H')).toBe('idul-adha-1447-h')
  })

  it('run spasi/tanda baca jadi satu dash; dash ganda dirapikan', () => {
    expect(slugify('  Halo,,,   Dunia!!  ')).toBe('halo-dunia')
    expect(slugify('a---b')).toBe('a-b')
  })

  it('non-ASCII dibuang tanpa transliterasi (ASCII-only)', () => {
    expect(slugify('Café & Kopi — Edisi Spesial')).toBe('caf-kopi-edisi-spesial')
  })

  it('angka dan dash dipertahankan', () => {
    expect(slugify('Ramadhan 1446 H - Edisi Khusus')).toBe('ramadhan-1446-h-edisi-khusus')
  })

  it('tanpa karakter alfanumerik -> string kosong', () => {
    expect(slugify('!!!')).toBe('')
    expect(slugify('   ')).toBe('')
  })
})

describe('uniqueSlug', () => {
  beforeEach(() => {
    h.articleFindFirstMock.mockReset()
  })

  it('slug bebas -> dikembalikan apa adanya', async () => {
    h.articleFindFirstMock.mockResolvedValue(null)

    await expect(uniqueSlug('pengajian-rutin')).resolves.toBe('pengajian-rutin')
    expect(h.articleFindFirstMock).toHaveBeenCalledWith({
      where: { slug: 'pengajian-rutin' },
      select: { id: true },
    })
  })

  it('duplikat -> append -2, -3, … sampai bebas', async () => {
    h.articleFindFirstMock
      .mockResolvedValueOnce({ id: 'a1' })
      .mockResolvedValueOnce({ id: 'a2' })
      .mockResolvedValueOnce(null)

    await expect(uniqueSlug('pengajian-rutin')).resolves.toBe('pengajian-rutin-3')
    expect(h.articleFindFirstMock).toHaveBeenCalledTimes(3)
    expect(h.articleFindFirstMock).toHaveBeenNthCalledWith(1, {
      where: { slug: 'pengajian-rutin' },
      select: { id: true },
    })
    expect(h.articleFindFirstMock).toHaveBeenNthCalledWith(2, {
      where: { slug: 'pengajian-rutin-2' },
      select: { id: true },
    })
    expect(h.articleFindFirstMock).toHaveBeenNthCalledWith(3, {
      where: { slug: 'pengajian-rutin-3' },
      select: { id: true },
    })
  })

  it('excludeId -> slug milik artikel sendiri diabaikan', async () => {
    h.articleFindFirstMock.mockResolvedValue(null)

    await expect(uniqueSlug('artikel-sendiri', 'art-9')).resolves.toBe('artikel-sendiri')
    expect(h.articleFindFirstMock).toHaveBeenCalledWith({
      where: { slug: 'artikel-sendiri', id: { not: 'art-9' } },
      select: { id: true },
    })
  })

  it('base kotor dinormalisasi dulu (idempoten)', async () => {
    h.articleFindFirstMock.mockResolvedValue(null)

    await expect(uniqueSlug('  Pengajian Rutin! ')).resolves.toBe('pengajian-rutin')
  })
})
