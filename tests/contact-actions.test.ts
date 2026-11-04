import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  sectionFindUniqueMock: vi.fn(),
  sectionUpdateMock: vi.fn(),
  sectionCreateMock: vi.fn(),
  settingUpsertMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: h.userFindUniqueMock },
    section: {
      findUnique: h.sectionFindUniqueMock,
      update: h.sectionUpdateMock,
      create: h.sectionCreateMock,
    },
    setting: {
      upsert: h.settingUpsertMock,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePathMock,
}))

import { setKontakSettings } from '@/app/admin/(dashboard)/pengaturan/kontak/actions'

function loginAs(role: Role): void {
  h.authMock.mockResolvedValue({
    user: { id: 'u-admin-1', name: 'Admin', role },
    expires: '2099-01-01T00:00:00.000Z',
  })
  h.userFindUniqueMock.mockResolvedValue({
    id: 'u-admin-1',
    name: 'Admin',
    role,
    isActive: true,
  })
}

describe('setKontakSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('ADMIN')
  })

  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(
      setKontakSettings({
        alamat: 'Jl. Tes',
        telp: '08123',
        whatsapp: '08123',
        email: 'tes@dkm.id',
        jam: '08:00 - 17:00',
        mapUrl: 'https://maps.app.goo.gl/x',
        mapQuery: 'embed',
      }),
    ).rejects.toThrow('Akses ditolak')

    expect(h.sectionUpdateMock).not.toHaveBeenCalled()
  })

  it('ADMIN: memperbarui section kontak yang ada dan menyinkronkan setting global', async () => {
    h.sectionFindUniqueMock.mockResolvedValue({
      id: 'sec-kontak-1',
      key: 'kontak',
      title: 'Kontak',
      content: { address: 'lama' },
    })
    h.sectionUpdateMock.mockResolvedValue({ id: 'sec-kontak-1' })
    h.settingUpsertMock.mockResolvedValue({ key: 'site.address', value: 'Perum Arwana' })

    const result = await setKontakSettings({
      alamat: 'Perum Arwana',
      telp: '081234567890',
      whatsapp: '081234567890',
      email: 'dkm@annuur.id',
      jam: '04.00 - 21.00 WIB',
      mapUrl: 'https://maps.app.goo.gl/arwana',
      mapQuery: '<iframe src="https://maps.google.com/embed"></iframe>',
    })

    expect(result).toEqual({ ok: true })
    expect(h.sectionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sec-kontak-1' },
        data: expect.objectContaining({
          content: expect.objectContaining({
            alamat: 'Perum Arwana',
            address: 'Perum Arwana',
            telp: '081234567890',
            phone: '081234567890',
            whatsapp: '081234567890',
            email: 'dkm@annuur.id',
            jam: '04.00 - 21.00 WIB',
            mapUrl: 'https://maps.app.goo.gl/arwana',
            mapQuery: '<iframe src="https://maps.google.com/embed"></iframe>',
          }),
        }),
      }),
    )

    // Revalidate paths
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/kontak')
  })

  it('ADMIN: membuat section kontak baru jika belum ada di database', async () => {
    h.sectionFindUniqueMock.mockResolvedValue(null)
    h.sectionCreateMock.mockResolvedValue({ id: 'sec-kontak-new' })

    const result = await setKontakSettings({
      alamat: 'Jl. Baru',
      telp: '0899',
      whatsapp: '0899',
      email: 'admin@annuur.id',
      jam: '24 Jam',
      mapUrl: '',
      mapQuery: '',
    })

    expect(result).toEqual({ ok: true })
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'kontak',
          title: 'Kontak & Lokasi',
          isVisible: true,
        }),
      }),
    )
  })
})
