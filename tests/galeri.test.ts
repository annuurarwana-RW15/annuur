import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  sectionFindFirstMock: vi.fn(),
  sectionUpdateMock: vi.fn(),
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
    section: {
      findFirst: h.sectionFindFirstMock,
      update: h.sectionUpdateMock,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import { deleteGaleriItem, saveGaleriItem } from '@/app/admin/(dashboard)/galeri/actions'

const SECTION = { id: 'sec-galeri', key: 'galeri', title: 'Galeri' }

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

function seedSection(content: unknown): void {
  h.sectionFindFirstMock.mockResolvedValue({ ...SECTION, content })
}

function savedImages(): { url: string; caption: string }[] {
  const call = h.sectionUpdateMock.mock.calls.at(-1)
  expect(call).toBeTruthy()
  const content = call?.[0]?.data?.content as Record<string, unknown>
  return content.images as { url: string; caption: string }[]
}

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  seedSection({ images: ['https://cdn.test/a.jpg'] })
})

describe('saveGaleriItem', () => {
  it('VIEWER ditolak tanpa menyentuh database', async () => {
    loginAs('VIEWER')
    await expect(
      saveGaleriItem({ url: 'https://cdn.test/b.jpg' }),
    ).rejects.toThrow('Akses ditolak')
    expect(h.sectionFindFirstMock).not.toHaveBeenCalled()
  })

  it('tambah baru: seed string[] dinormalkan jadi {url,caption} dan item baru tersimpan', async () => {
    const result = await saveGaleriItem({
      url: '/uploads/galeri/c.jpg',
      caption: 'Renovasi',
    })

    expect(result).toEqual({ ok: true })
    const images = savedImages()
    expect(images).toHaveLength(2)
    expect(images[0]).toEqual({ url: 'https://cdn.test/a.jpg', caption: '' })
    expect(images[1]).toEqual({ url: '/uploads/galeri/c.jpg', caption: 'Renovasi' })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/galeri')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/galeri')
  })

  it('edit pada index tertentu hanya mengganti baris tersebut', async () => {
    seedSection({
      images: [
        { url: 'https://cdn.test/1.jpg', caption: 'Satu' },
        { url: 'https://cdn.test/2.jpg', caption: 'Dua' },
      ],
    })

    const result = await saveGaleriItem({
      index: 0,
      url: 'https://cdn.test/baru.jpg',
      caption: 'Diganti',
    })

    expect(result.ok).toBe(true)
    const images = savedImages()
    expect(images).toHaveLength(2)
    expect(images[0]).toEqual({ url: 'https://cdn.test/baru.jpg', caption: 'Diganti' })
    expect(images[1]).toEqual({ url: 'https://cdn.test/2.jpg', caption: 'Dua' })
  })

  it('menolak URL kosong/tidak valid dan keterangan > 120 karakter', async () => {
    expect((await saveGaleriItem({ url: '   ' })).error).toMatch(/URL wajib/)
    expect((await saveGaleriItem({ url: 'cdn.test/x.jpg' })).error).toMatch(/tidak valid/)
    expect(
      (await saveGaleriItem({ url: 'https://cdn.test/x.jpg', caption: 'x'.repeat(121) }))
        .error,
    ).toMatch(/maksimal 120/)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
  })

  it('index di luar rentang → error tanpa update', async () => {
    const result = await saveGaleriItem({ index: 9, url: 'https://cdn.test/x.jpg' })
    expect(result).toEqual({ ok: false, error: 'Foto tidak ditemukan' })
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
  })

  it('section galeri tidak ada → error', async () => {
    h.sectionFindFirstMock.mockResolvedValue(null)
    const result = await saveGaleriItem({ url: 'https://cdn.test/x.jpg' })
    expect(result.ok).toBe(false)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
  })
})

describe('deleteGaleriItem', () => {
  it('menghapus baris sesuai index dan me-revalidate halaman publik', async () => {
    seedSection({
      images: [
        { url: 'https://cdn.test/1.jpg', caption: 'Satu' },
        { url: 'https://cdn.test/2.jpg', caption: 'Dua' },
      ],
    })

    const result = await deleteGaleriItem(0)
    expect(result).toEqual({ ok: true })
    expect(savedImages()).toEqual([{ url: 'https://cdn.test/2.jpg', caption: 'Dua' }])
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/galeri')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('index di luar rentang → error tanpa update', async () => {
    expect(await deleteGaleriItem(5)).toEqual({
      ok: false,
      error: 'Foto tidak ditemukan',
    })
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
  })
})
