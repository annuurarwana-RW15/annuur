import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const { authMock, userFindUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { user: { findUnique: userFindUniqueMock } },
}))

import { getSessionUser, requireRole } from '@/lib/rbac'

interface FakeUser {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
}

function fakeDbUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@an-nur.local',
    role: 'ADMIN',
    isActive: true,
    ...overrides,
  }
}

function fakeSession(user: Partial<FakeUser> | null) {
  if (!user) return null
  return {
    user: {
      id: user.id ?? 'user-1',
      name: user.name ?? 'Admin',
      email: user.email ?? 'admin@an-nur.local',
      role: user.role ?? 'ADMIN',
      isActive: user.isActive ?? true,
    },
    expires: '2099-01-01T00:00:00.000Z',
  }
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return null
  } catch (error) {
    return error
  }
}

describe('requireRole', () => {
  beforeEach(() => {
    authMock.mockReset()
    userFindUniqueMock.mockReset()
  })

  it('redirect ke /admin/login ketika belum login (tanpa session)', async () => {
    authMock.mockResolvedValue(null)

    const error = await captureError(requireRole('ADMIN'))

    expect(error).toBeInstanceOf(Error)
    const digest = (error as Error & { digest?: string }).digest ?? ''
    expect(String(digest)).toContain('NEXT_REDIRECT')
    expect(String(digest)).toContain('/admin/login')
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('redirect ke /admin/login ketika session tidak berisi user', async () => {
    authMock.mockResolvedValue({ user: null, expires: '2099-01-01T00:00:00.000Z' })

    const error = await captureError(requireRole('ADMIN'))

    const digest = (error as Error & { digest?: string }).digest ?? ''
    expect(String(digest)).toContain('/admin/login')
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('melempar "Akses ditolak" ketika user tidak ditemukan di database', async () => {
    authMock.mockResolvedValue(fakeSession(fakeDbUser()))
    userFindUniqueMock.mockResolvedValue(null)

    await expect(requireRole('ADMIN')).rejects.toThrow('Akses ditolak')
  })

  it('melempar "Akses ditolak" ketika user nonaktif (isActive false)', async () => {
    const dbUser = fakeDbUser({ isActive: false })
    authMock.mockResolvedValue(fakeSession(dbUser))
    userFindUniqueMock.mockResolvedValue(dbUser)

    await expect(requireRole('ADMIN')).rejects.toThrow('Akses ditolak')
  })

  it('melempar "Akses ditolak" ketika role di database tidak diizinkan', async () => {
    const dbUser = fakeDbUser({ role: 'VIEWER' })
    authMock.mockResolvedValue(fakeSession(dbUser))
    userFindUniqueMock.mockResolvedValue(dbUser)

    await expect(requireRole('ADMIN', 'BENDAHARA')).rejects.toThrow('Akses ditolak')
  })

  it('melempar "Akses ditolak" ketika role di session basi (berbeda dari database)', async () => {
    authMock.mockResolvedValue(fakeSession(fakeDbUser({ role: 'ADMIN' })))
    userFindUniqueMock.mockResolvedValue(fakeDbUser({ role: 'VIEWER' }))

    await expect(requireRole('ADMIN')).rejects.toThrow('Akses ditolak')
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, name: true, role: true, isActive: true },
    })
  })

  it('mengembalikan {id, name, role} ketika role diizinkan', async () => {
    const dbUser = fakeDbUser({ id: 'u-9', name: 'Bendahara', role: 'BENDAHARA' })
    authMock.mockResolvedValue(fakeSession(dbUser))
    userFindUniqueMock.mockResolvedValue(dbUser)

    const result = await requireRole('ADMIN', 'BENDAHARA')

    expect(result).toEqual({ id: 'u-9', name: 'Bendahara', role: 'BENDAHARA' })
  })

  it('menerima salah satu dari beberapa role yang diizinkan', async () => {
    const dbUser = fakeDbUser({ role: 'KONTEN', name: 'Konten' })
    authMock.mockResolvedValue(fakeSession(dbUser))
    userFindUniqueMock.mockResolvedValue(dbUser)

    const result = await requireRole('ADMIN', 'KONTEN')

    expect(result).toEqual({ id: 'user-1', name: 'Konten', role: 'KONTEN' })
  })
})

describe('getSessionUser', () => {
  beforeEach(() => {
    authMock.mockReset()
    userFindUniqueMock.mockReset()
  })

  it('mengembalikan null ketika belum login', async () => {
    authMock.mockResolvedValue(null)

    await expect(getSessionUser()).resolves.toBeNull()
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('mengembalikan {id, name, role} dari session', async () => {
    authMock.mockResolvedValue(
      fakeSession(fakeDbUser({ id: 'u-7', name: 'Konten', role: 'KONTEN' })),
    )

    await expect(getSessionUser()).resolves.toEqual({
      id: 'u-7',
      name: 'Konten',
      role: 'KONTEN',
    })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })
})
