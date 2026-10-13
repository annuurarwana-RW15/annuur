import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  sectionFindUniqueMock: vi.fn(),
  sectionFindManyMock: vi.fn(),
  sectionUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
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
      findUnique: h.sectionFindUniqueMock,
      findMany: h.sectionFindManyMock,
      update: h.sectionUpdateMock,
    },
    $transaction: h.transactionMock,
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import { reorderSections, toggleSection, updateSection } from '@/app/admin/(dashboard)/sections/actions'
import { buildContent, readField } from '@/app/admin/(dashboard)/sections/section-content'

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
  h.transactionMock.mockImplementation((ops: unknown[]) => Promise.all(ops))
  loginAs('ADMIN')
})

describe('updateSection', () => {
  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(
      updateSection('s-1', 'Judul', { text: 'isi' }),
    ).rejects.toThrow('Akses ditolak')

    expect(h.sectionFindUniqueMock).not.toHaveBeenCalled()
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('ADMIN: sukses menyimpan lalu revalidatePath("/")', async () => {
    h.sectionFindUniqueMock.mockResolvedValue({
      id: 's-1',
      key: 'profil',
      title: 'Lama',
      content: { body: 'lama' },
    })
    h.sectionUpdateMock.mockResolvedValue({ id: 's-1' })

    const result = await updateSection('s-1', 'Profil Masjid', { text: 'baru' })

    expect(result).toEqual({ ok: true })
    expect(h.sectionUpdateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: { title: 'Profil Masjid', content: { text: 'baru' } },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('id tidak ada → {ok:false} tanpa update & tanpa revalidate', async () => {
    h.sectionFindUniqueMock.mockResolvedValue(null)

    const result = await updateSection('hilang', 'Judul', { text: 'x' })

    expect(result.ok).toBe(false)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('judul kosong → {ok:false} tanpa menyentuh database', async () => {
    const result = await updateSection('s-1', '   ', { text: 'x' })

    expect(result.ok).toBe(false)
    expect(h.sectionFindUniqueMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it.each([
    ['array', []],
    ['null', null],
    ['string', 'bukan-objek'],
  ])('content %s → {ok:false} tanpa update & tanpa revalidate', async (_label, content) => {
    h.sectionFindUniqueMock.mockResolvedValue({ id: 's-1', key: 'profil' })

    const result = await updateSection('s-1', 'Judul', content)

    expect(result.ok).toBe(false)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('toggleSection', () => {
  it('VIEWER melempar "Akses ditolak"', async () => {
    loginAs('VIEWER')

    await expect(toggleSection('s-1', false)).rejects.toThrow('Akses ditolak')

    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('ADMIN: memperbarui isVisible lalu revalidatePath("/")', async () => {
    h.sectionFindUniqueMock.mockResolvedValue({ id: 's-1', isVisible: true })
    h.sectionUpdateMock.mockResolvedValue({ id: 's-1' })

    await expect(toggleSection('s-1', false)).resolves.toBeUndefined()

    expect(h.sectionUpdateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: { isVisible: false },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('id tidak ada → melempar tanpa update & tanpa revalidate', async () => {
    h.sectionFindUniqueMock.mockResolvedValue(null)

    await expect(toggleSection('hilang', true)).rejects.toThrow(
      'Section tidak ditemukan',
    )
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('reorderSections', () => {
  const existing = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('VIEWER melempar "Akses ditolak"', async () => {
    loginAs('VIEWER')

    await expect(reorderSections(['a', 'b', 'c'])).rejects.toThrow('Akses ditolak')

    expect(h.sectionFindManyMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id set tidak sama → {ok:false} tanpa update & tanpa revalidate', async () => {
    h.sectionFindManyMock.mockResolvedValue(existing)

    const result = await reorderSections(['a', 'b'])

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.transactionMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id duplikat → {ok:false}', async () => {
    h.sectionFindManyMock.mockResolvedValue(existing)

    const result = await reorderSections(['a', 'a', 'c'])

    expect(result.ok).toBe(false)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id di luar database → {ok:false}', async () => {
    h.sectionFindManyMock.mockResolvedValue(existing)

    const result = await reorderSections(['a', 'b', 'z'])

    expect(result.ok).toBe(false)
    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('ADMIN: set sesuai → update order per index dalam transaksi + revalidatePath("/")', async () => {
    h.sectionFindManyMock.mockResolvedValue(existing)
    h.sectionUpdateMock.mockResolvedValue({})

    const result = await reorderSections(['c', 'a', 'b'])

    expect(result).toEqual({ ok: true })
    expect(h.sectionUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { id: 'c' },
      data: { order: 0 },
    })
    expect(h.sectionUpdateMock).toHaveBeenNthCalledWith(2, {
      where: { id: 'a' },
      data: { order: 1 },
    })
    expect(h.sectionUpdateMock).toHaveBeenNthCalledWith(3, {
      where: { id: 'b' },
      data: { order: 2 },
    })
    expect(h.transactionMock).toHaveBeenCalledTimes(1)
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
  })
})

describe('readField', () => {
  it('membaca kunci bentuk-editor bila ada', () => {
    expect(readField({ text: 'baru', body: 'lama' }, 'profil', 'text')).toBe('baru')
  })

  it('jatuh ke kunci legacy seed bila kunci bentuk-editor belum ada', () => {
    expect(readField({ body: 'isi profil' }, 'profil', 'text')).toBe('isi profil')
    expect(readField({ address: 'Jl. A' }, 'kontak', 'alamat')).toBe('Jl. A')
    expect(readField({ socialLinks: [{ label: 'IG' }] }, 'footer', 'social')).toEqual([
      { label: 'IG' },
    ])
  })

  it('konten tidak berbentuk objek → undefined', () => {
    expect(readField(null, 'profil', 'text')).toBeUndefined()
    expect(readField(['x'], 'profil', 'text')).toBeUndefined()
    expect(readField({}, 'hero', 'ctaLabel')).toBeUndefined()
  })
})

describe('buildContent', () => {
  it('profil: menulis content.text dan menyinkronkan alias legacy body', () => {
    const out = buildContent('profil', { body: 'lama', extra: 1 }, 'Profil', {
      text: 'baru',
    })

    expect(out).toEqual({ text: 'baru', body: 'baru', extra: 1 })
  })

  it('hero: heading mengikuti judul + alias subheading & image tersinkron', () => {
    const out = buildContent(
      'hero',
      { heading: 'Lama', subheading: 'S', image: null },
      'Masjid An-nuur',
      {
        subjudul: 'Sub baru',
        imageUrl: 'https://cdn.test/hero.jpg',
        ctaLabel: 'Donasi',
        ctaHref: '/donasi',
      },
    )

    expect(out).toMatchObject({
      heading: 'Masjid An-nuur',
      subjudul: 'Sub baru',
      subheading: 'Sub baru',
      imageUrl: 'https://cdn.test/hero.jpg',
      image: 'https://cdn.test/hero.jpg',
      ctaLabel: 'Donasi',
      ctaHref: '/donasi',
    })
  })

  it('kontak: alias address/phone/hours/mapEmbed ikut diperbarui', () => {
    const out = buildContent('kontak', { address: 'a' }, 'Kontak', {
      alamat: 'Jl. Baru 1',
      telp: '0812',
      email: 'a@b.c',
      jam: '08.00–17.00',
      mapQuery: 'Arwana',
    })

    expect(out).toMatchObject({
      alamat: 'Jl. Baru 1',
      address: 'Jl. Baru 1',
      telp: '0812',
      phone: '0812',
      email: 'a@b.c',
      jam: '08.00–17.00',
      hours: '08.00–17.00',
      mapQuery: 'Arwana',
      mapEmbed: 'Arwana',
    })
  })

  it('footer: social disinkronkan ke socialLinks', () => {
    const social = [{ label: 'Instagram', url: 'https://ig.test/x' }]
    const out = buildContent('footer', { text: 'lama' }, 'Footer', {
      text: 'baru',
      social,
    })

    expect(out.text).toBe('baru')
    expect(out.social).toEqual(social)
    expect(out.socialLinks).toEqual(social)
  })

  it('galeri: images diteruskan tanpa alias tambahan', () => {
    const images = [{ url: 'https://cdn.test/1.jpg', caption: 'Satu' }]
    const out = buildContent('galeri', { images: [], keep: 'k' }, 'Galeri', { images })

    expect(out).toEqual({ images, keep: 'k' })
  })

  it('konten lama bukan objek tidak membuat build gagal', () => {
    const out = buildContent('profil', null, 'Profil', { text: 't' })

    expect(out).toEqual({ text: 't', body: 't' })
  })
})
