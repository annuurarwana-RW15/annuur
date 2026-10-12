import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  articleFindUniqueMock: vi.fn(),
  articleFindFirstMock: vi.fn(),
  articleCreateMock: vi.fn(),
  articleUpdateMock: vi.fn(),
  articleDeleteMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: h.userFindUniqueMock },
    article: {
      findUnique: h.articleFindUniqueMock,
      findFirst: h.articleFindFirstMock,
      create: h.articleCreateMock,
      update: h.articleUpdateMock,
      delete: h.articleDeleteMock,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import {
  deleteArticle,
  publishArticle,
  saveArticle,
} from '@/app/admin/(dashboard)/artikel/actions'

function loginAs(role: Role): void {
  h.authMock.mockResolvedValue({
    user: { id: 'u-1', name: 'Pengguna', role },
    expires: '2099-01-01T00:00:00.000Z',
  })
  h.userFindUniqueMock.mockResolvedValue({
    id: 'u-1',
    name: 'Pengguna',
    role,
    isActive: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  h.articleFindFirstMock.mockResolvedValue(null)
})

describe('saveArticle — gating', () => {
  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(
      saveArticle({ title: 'Judul', body: 'Isi', status: 'PUBLISHED' }),
    ).rejects.toThrow('Akses ditolak')

    expect(h.articleFindFirstMock).not.toHaveBeenCalled()
    expect(h.articleCreateMock).not.toHaveBeenCalled()
    expect(h.articleUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('judul kosong -> {ok:false} tanpa menyentuh database', async () => {
    const result = await saveArticle({ title: '   ', body: 'Isi' })

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.articleFindFirstMock).not.toHaveBeenCalled()
    expect(h.articleCreateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('isi kosong -> {ok:false} tanpa menyentuh database', async () => {
    const result = await saveArticle({ title: 'Judul Valid', body: '   ' })

    expect(result.ok).toBe(false)
    expect(h.articleCreateMock).not.toHaveBeenCalled()
  })
})

describe('saveArticle — create', () => {
  it('ADMIN PUBLISHED: slug otomatis dari judul + create + revalidatePath halaman publik', async () => {
    h.articleCreateMock.mockResolvedValue({ id: 'a1' })

    const result = await saveArticle({
      title: 'Pengajian Rutin Mingguan!',
      body: 'Isi pengajian.',
      status: 'PUBLISHED',
      category: 'Kegiatan',
    })

    expect(result).toEqual({ ok: true, slug: 'pengajian-rutin-mingguan' })
    expect(h.articleCreateMock).toHaveBeenCalledTimes(1)
    expect(h.articleCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Pengajian Rutin Mingguan!',
        slug: 'pengajian-rutin-mingguan',
        body: 'Isi pengajian.',
        category: 'Kegiatan',
        status: 'PUBLISHED',
        authorId: 'u-1',
        publishedAt: expect.any(Date),
      }),
    })
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/berita')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/kegiatan')
  })

  it('ADMIN DRAFT: create tanpa revalidatePath publik', async () => {
    h.articleCreateMock.mockResolvedValue({ id: 'a2' })

    const result = await saveArticle({ title: 'Draf Kegiatan', body: 'Belum terbit.' })

    expect(result).toEqual({ ok: true, slug: 'draf-kegiatan' })
    expect(h.articleCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'DRAFT',
        publishedAt: null,
        authorId: 'u-1',
      }),
    })
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('slug kolot dengan duplikat -> diberi akhiran -2', async () => {
    h.articleFindFirstMock
      .mockResolvedValueOnce({ id: 'lain' })
      .mockResolvedValueOnce(null)
    h.articleCreateMock.mockResolvedValue({ id: 'a3' })

    const result = await saveArticle({ title: 'Pengajian Rutin', body: 'Isi' })

    expect(result).toEqual({ ok: true, slug: 'pengajian-rutin-2' })
  })

  it('slug manual dipakai bila diisi (bukan judul)', async () => {
    h.articleCreateMock.mockResolvedValue({ id: 'a4' })

    const result = await saveArticle({
      title: 'Judul Manual',
      slug: 'Kustom Slug!',
      body: 'Isi',
    })

    expect(result).toEqual({ ok: true, slug: 'kustom-slug' })
  })
})

describe('saveArticle — update', () => {
  it('id ada: update, slug milik sendiri dipertahankan, publishedAt lama dipertahankan', async () => {
    const publishedAt = new Date('2026-01-01T00:00:00.000Z')
    h.articleFindUniqueMock.mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      publishedAt,
      authorId: 'lain',
    })
    h.articleUpdateMock.mockResolvedValue({})

    const result = await saveArticle({
      id: 'a1',
      title: 'Judul Lama',
      slug: 'judul-lama',
      body: 'Isi baru',
      status: 'PUBLISHED',
    })

    expect(result).toEqual({ ok: true, slug: 'judul-lama' })
    expect(h.articleFindFirstMock).toHaveBeenCalledWith({
      where: { slug: 'judul-lama', id: { not: 'a1' } },
      select: { id: true },
    })
    expect(h.articleCreateMock).not.toHaveBeenCalled()
    expect(h.articleUpdateMock).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({
        title: 'Judul Lama',
        slug: 'judul-lama',
        status: 'PUBLISHED',
        publishedAt,
      }),
    })
    expect(h.articleUpdateMock.mock.calls[0][0].data.authorId).toBeUndefined()
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
  })

  it('unpublish lewat simpan (PUBLISHED -> DRAFT): publishedAt di-null-kan + tetap revalidate', async () => {
    h.articleFindUniqueMock.mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    h.articleUpdateMock.mockResolvedValue({})

    const result = await saveArticle({
      id: 'a1',
      title: 'Judul',
      slug: 'judul',
      body: 'Isi',
      status: 'DRAFT',
    })

    expect(result.ok).toBe(true)
    expect(h.articleUpdateMock).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({ status: 'DRAFT', publishedAt: null }),
    })
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
  })

  it('id tidak ada -> {ok:false} tanpa update & tanpa revalidate', async () => {
    h.articleFindUniqueMock.mockResolvedValue(null)

    const result = await saveArticle({
      id: 'hilang',
      title: 'Judul',
      body: 'Isi',
      status: 'PUBLISHED',
    })

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.articleUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('deleteArticle', () => {
  it('VIEWER melempar "Akses ditolak" tanpa menghapus', async () => {
    loginAs('VIEWER')

    await expect(deleteArticle('a1')).rejects.toThrow('Akses ditolak')
    expect(h.articleDeleteMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id tidak ada -> melempar tanpa delete', async () => {
    h.articleFindUniqueMock.mockResolvedValue(null)

    await expect(deleteArticle('hilang')).rejects.toThrow('Artikel tidak ditemukan')
    expect(h.articleDeleteMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('artikel PUBLISHED: hapus + revalidatePath halaman publik', async () => {
    h.articleFindUniqueMock.mockResolvedValue({ id: 'a1', status: 'PUBLISHED' })
    h.articleDeleteMock.mockResolvedValue({})

    await expect(deleteArticle('a1')).resolves.toBeUndefined()

    expect(h.articleDeleteMock).toHaveBeenCalledWith({ where: { id: 'a1' } })
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/kegiatan')
  })

  it('artikel DRAFT: hapus tanpa revalidatePath publik', async () => {
    h.articleFindUniqueMock.mockResolvedValue({ id: 'a1', status: 'DRAFT' })
    h.articleDeleteMock.mockResolvedValue({})

    await deleteArticle('a1')

    expect(h.articleDeleteMock).toHaveBeenCalledWith({ where: { id: 'a1' } })
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('publishArticle', () => {
  it('VIEWER melempar "Akses ditolak" tanpa update', async () => {
    loginAs('VIEWER')

    await expect(publishArticle('a1', true)).rejects.toThrow('Akses ditolak')
    expect(h.articleUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id tidak ada -> melempar tanpa update', async () => {
    h.articleFindUniqueMock.mockResolvedValue(null)

    await expect(publishArticle('hilang', true)).rejects.toThrow(
      'Artikel tidak ditemukan',
    )
    expect(h.articleUpdateMock).not.toHaveBeenCalled()
  })

  it('publish: status PUBLISHED + publishedAt terisi + revalidatePath publik', async () => {
    h.articleFindUniqueMock.mockResolvedValue({ id: 'a1', status: 'DRAFT', publishedAt: null })
    h.articleUpdateMock.mockResolvedValue({})

    await expect(publishArticle('a1', true)).resolves.toBeUndefined()

    expect(h.articleUpdateMock).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'PUBLISHED', publishedAt: expect.any(Date) },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
  })

  it('publish ulang: publishedAt lama TIDAK di-reset', async () => {
    const publishedAt = new Date('2026-02-02T00:00:00.000Z')
    h.articleFindUniqueMock.mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      publishedAt,
    })
    h.articleUpdateMock.mockResolvedValue({})

    await publishArticle('a1', true)

    expect(h.articleUpdateMock).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'PUBLISHED', publishedAt },
    })
  })

  it('unpublish: status DRAFT + publishedAt null + revalidatePath publik', async () => {
    h.articleFindUniqueMock.mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-02-02T00:00:00.000Z'),
    })
    h.articleUpdateMock.mockResolvedValue({})

    await publishArticle('a1', false)

    expect(h.articleUpdateMock).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'DRAFT', publishedAt: null },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledTimes(3)
  })
})
