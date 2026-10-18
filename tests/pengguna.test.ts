import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  hashMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: h.userFindUniqueMock,
      create: h.userCreateMock,
      update: h.userUpdateMock,
    },
  },
}))

vi.mock('bcryptjs', () => ({ hash: h.hashMock, compare: vi.fn() }))

import { saveUser, type SaveUserInput } from '@/app/admin/(dashboard)/pengguna/actions'

const SESSION_ID = 'u-1'

function loginAs(role: Role, id = SESSION_ID): void {
  h.authMock.mockResolvedValue({
    user: { id, name: 'Pengguna', role },
    expires: '2099-01-01T00:00:00.000Z',
  })
  h.userFindUniqueMock.mockResolvedValue({
    id,
    name: 'Pengguna',
    role,
    isActive: true,
  })
}

const NEW_USER: SaveUserInput = {
  name: 'Budi Santoso',
  email: 'budi@example.com',
  role: 'BENDAHARA',
  password: 'rahasia123',
  isActive: true,
}

/** Payload yang benar-benar dikirim ke db.user.create — ambil argumennya. */
function createArgs(): { data: Record<string, unknown> } {
  return h.userCreateMock.mock.calls[0][0] as { data: Record<string, unknown> }
}

function updateArgs(): { where: { id: string }; data: Record<string, unknown> } {
  return h.userUpdateMock.mock.calls[0][0] as {
    where: { id: string }
    data: Record<string, unknown>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  loginAs('ADMIN')
  h.hashMock.mockResolvedValue('$2a$10$hashedpassword')
  h.userCreateMock.mockResolvedValue({})
  h.userUpdateMock.mockResolvedValue({})
})

describe('saveUser — gating', () => {
  it('BENDAHARA ditolak: saveUser khusus ADMIN', async () => {
    loginAs('BENDAHARA')

    await expect(saveUser(NEW_USER)).rejects.toThrow('Akses ditolak')

    expect(h.userCreateMock).not.toHaveBeenCalled()
    expect(h.userUpdateMock).not.toHaveBeenCalled()
    expect(h.hashMock).not.toHaveBeenCalled()
  })

  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(saveUser(NEW_USER)).rejects.toThrow('Akses ditolak')

    expect(h.userCreateMock).not.toHaveBeenCalled()
    expect(h.userUpdateMock).not.toHaveBeenCalled()
  })

  it('pengguna nonaktif ditolak tanpa menyentuh database', async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: SESSION_ID,
      name: 'Pengguna',
      role: 'ADMIN',
      isActive: false,
    })

    await expect(saveUser(NEW_USER)).rejects.toThrow('Akses ditolak')
    expect(h.userCreateMock).not.toHaveBeenCalled()
  })
})

describe('saveUser — pengguna baru', () => {
  it('password di-hash (cost 10) lalu disimpan sebagai passwordHash', async () => {
    const result = await saveUser(NEW_USER)

    expect(result).toEqual({ ok: true })
    expect(h.hashMock).toHaveBeenCalledWith('rahasia123', 10)
    expect(h.userCreateMock).toHaveBeenCalledTimes(1)
    expect(createArgs().data).toMatchObject({
      name: 'Budi Santoso',
      email: 'budi@example.com',
      role: 'BENDAHARA',
      isActive: true,
      passwordHash: '$2a$10$hashedpassword',
    })
    expect(createArgs().data).not.toHaveProperty('password')
  })

  it('tanpa password → ditolak, database tidak disentuh', async () => {
    const withoutPassword: SaveUserInput = { ...NEW_USER, password: undefined }

    const result = await saveUser(withoutPassword)

    expect(result).toEqual({
      ok: false,
      error: 'Password wajib diisi untuk pengguna baru',
    })
    expect(h.userCreateMock).not.toHaveBeenCalled()
    expect(h.hashMock).not.toHaveBeenCalled()
  })

  it('email terdaftar (P2002) → pesan ramah, bukan pesan Prisma', async () => {
    h.userCreateMock.mockRejectedValue({ code: 'P2002' })

    const result = await saveUser(NEW_USER)

    expect(result).toEqual({ ok: false, error: 'Email sudah terdaftar' })
  })

  it('error tak terduga → "Gagal menyimpan pengguna"', async () => {
    h.userCreateMock.mockRejectedValue({ code: 'P2025' })

    const result = await saveUser(NEW_USER)

    expect(result).toEqual({ ok: false, error: 'Gagal menyimpan pengguna' })
  })
})

describe('saveUser — pengguna tersimpan', () => {
  const EDIT: SaveUserInput = {
    id: 'u-2',
    name: 'Siti',
    email: 'siti@example.com',
    role: 'KONTEN',
    isActive: true,
  }

  it('tanpa password baru → passwordHash TIDAK disertakan (tidak ditimpa)', async () => {
    const result = await saveUser(EDIT)

    expect(result).toEqual({ ok: true })
    expect(h.hashMock).not.toHaveBeenCalled()
    expect(updateArgs()).toEqual({
      where: { id: 'u-2' },
      data: {
        name: 'Siti',
        email: 'siti@example.com',
        role: 'KONTEN',
        isActive: true,
      },
    })
  })

  it('dengan password baru → hanya passwordHash yang di-hash', async () => {
    const result = await saveUser({ ...EDIT, password: 'barubaru' })

    expect(result).toEqual({ ok: true })
    expect(h.hashMock).toHaveBeenCalledWith('barubaru', 10)
    expect(updateArgs().data.passwordHash).toBe('$2a$10$hashedpassword')
    expect(updateArgs().data).not.toHaveProperty('password')
  })

  it('menonaktifkan diri sendiri ditolak', async () => {
    const result = await saveUser({ ...EDIT, id: SESSION_ID, isActive: false })

    expect(result).toEqual({ ok: false, error: 'Tidak bisa nonaktifkan diri sendiri' })
    expect(h.userUpdateMock).not.toHaveBeenCalled()
  })

  it('menonaktifkan pengguna lain diizinkan', async () => {
    const result = await saveUser({ ...EDIT, id: 'u-2', isActive: false })

    expect(result).toEqual({ ok: true })
    expect(updateArgs().data.isActive).toBe(false)
  })

  it('menonaktifkan diri sendiri TIDAK ditolak bila tetap aktif', async () => {
    const result = await saveUser({ ...EDIT, id: SESSION_ID, isActive: true })

    expect(result).toEqual({ ok: true })
    expect(h.userUpdateMock).toHaveBeenCalledTimes(1)
  })
})
