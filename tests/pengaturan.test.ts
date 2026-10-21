import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  settingUpsertMock: vi.fn(),
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
    setting: { upsert: h.settingUpsertMock },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import { setPengaturan, type PengaturanInput } from '@/app/admin/(dashboard)/pengaturan/actions'

const INPUT: PengaturanInput = {
  site: {
    name: 'Masjid An-nuur Arwana',
    address: 'Jl. Raya Arwana No. 1',
    phone: '0812-3456-7890',
    city: 'Arwana',
  },
  seo: { title: 'Judul SEO Global', description: 'Deskripsi SEO Global' },
  donasi: {
    rekening: [{ bank: 'BSI', no: '123', atasNama: 'DKM' }],
    qris: {
      image: 'https://cdn.example.com/qris.png',
      caption: 'Masjid An-nuur Arwana',
    },
  },
  ga4: { id: 'G-ABC1234567' },
}

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

/** Key yang benar-benar di-upsert, urut pemanggilan. */
function savedKeys(): string[] {
  return h.settingUpsertMock.mock.calls.map(
    (call) => (call[0] as { where: { key: string } }).where.key,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
})

describe('setPengaturan', () => {
  it('menyimpan seluruh grup form termasuk seo.title & seo.description', async () => {
    const result = await setPengaturan(INPUT)

    expect(result).toEqual({ ok: true })
    expect(savedKeys()).toEqual([
      'site.name',
      'site.address',
      'site.phone',
      'site.city',
      'seo.title',
      'seo.description',
      'donasi.rekening',
      'donasi.qris',
      'ga4.id',
    ])
  })

  it('nilai donasi.qris tersimpan persis (gambar + keterangan)', async () => {
    await setPengaturan(INPUT)

    const qris = h.settingUpsertMock.mock.calls.find(
      (call) => (call[0] as { where: { key: string } }).where.key === 'donasi.qris',
    )
    expect(qris).toBeDefined()
    expect(qris?.[0]).toMatchObject({
      update: {
        value: {
          image: 'https://cdn.example.com/qris.png',
          caption: 'Masjid An-nuur Arwana',
        },
      },
      create: { key: 'donasi.qris' },
    })
  })

  it('qris kosong (tanpa gambar) tetap tersimpan agar kartu disembunyikan', async () => {
    await setPengaturan({
      ...INPUT,
      donasi: { ...INPUT.donasi, qris: { image: '', caption: '' } },
    })

    const qris = h.settingUpsertMock.mock.calls.find(
      (call) => (call[0] as { where: { key: string } }).where.key === 'donasi.qris',
    )
    expect(qris?.[0]).toMatchObject({
      update: { value: { image: '', caption: '' } },
    })
  })

  it('nilai seo tersimpan persis apa adanya (bukan di-trim ulang oleh aksi)', async () => {
    await setPengaturan(INPUT)

    const seoTitle = h.settingUpsertMock.mock.calls.find(
      (call) => (call[0] as { where: { key: string } }).where.key === 'seo.title',
    )
    expect(seoTitle).toBeDefined()
    expect(seoTitle?.[0]).toMatchObject({
      update: { value: 'Judul SEO Global' },
      create: { key: 'seo.title', value: 'Judul SEO Global' },
    })
  })

  it('seo kosong tetap tersimpan (bukan dilewati) agar nilainya benar-benar kosong', async () => {
    await setPengaturan({
      ...INPUT,
      seo: { title: '', description: '' },
    })

    expect(savedKeys()).toContain('seo.title')
    expect(savedKeys()).toContain('seo.description')
  })

  it('revalidatePath("/", "layout") agar metadata root ikut tersegarkan', async () => {
    await setPengaturan(INPUT)

    expect(h.revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
  })

  it('VIEWER ditolak tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(setPengaturan(INPUT)).rejects.toThrow('Akses ditolak')
    expect(h.settingUpsertMock).not.toHaveBeenCalled()
  })
})
