import { beforeEach, describe, expect, it, vi } from 'vitest'

const { capturedConfig, compareMock, findUniqueMock } = vi.hoisted(() => ({
  capturedConfig: { config: null as unknown },
  compareMock: vi.fn(),
  findUniqueMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: (config: unknown) => {
    capturedConfig.config = config
    return { auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }
  },
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: (options: Record<string, unknown>) => ({
    id: 'credentials',
    type: 'credentials',
    ...options,
  }),
}))

vi.mock('bcryptjs', () => ({
  compare: compareMock,
}))

vi.mock('@/lib/db', () => ({
  db: { user: { findUnique: findUniqueMock } },
}))

import '@/lib/auth'

interface CapturedConfig {
  providers: {
    authorize?: (
      credentials: Record<string, unknown> | undefined,
    ) => Promise<unknown>
  }[]
}

function authorize(): NonNullable<CapturedConfig['providers'][number]['authorize']> {
  const config = capturedConfig.config as CapturedConfig
  const provider = config.providers[0]
  if (!provider?.authorize) throw new Error('authorize tidak ditemukan')
  return provider.authorize
}

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@an-nur.local',
    passwordHash: '$2b$10$hashasliuser',
    role: 'ADMIN',
    isActive: true,
    ...overrides,
  }
}

describe('authorize (Credentials)', () => {
  beforeEach(() => {
    compareMock.mockReset()
    findUniqueMock.mockReset()
  })

  it('tetap menjalankan bcrypt.compare saat email tidak ditemukan (waktu verifikasi disamakan)', async () => {
    findUniqueMock.mockResolvedValue(null)
    compareMock.mockResolvedValue(false)

    const result = await authorize()({
      email: 'tidak@ada.local',
      password: 'kata-sandi',
    })

    expect(result).toBeNull()
    expect(compareMock).toHaveBeenCalledTimes(1)
    expect(compareMock).toHaveBeenCalledWith(
      'kata-sandi',
      expect.stringMatching(/^\$2[aby]\$\d+\$/),
    )
  })

  it('menjalankan bcrypt.compare terhadap hash user saat user nonaktif', async () => {
    findUniqueMock.mockResolvedValue(dbUser({ isActive: false }))
    compareMock.mockResolvedValue(true)

    const result = await authorize()({
      email: 'admin@an-nur.local',
      password: 'kata-sandi',
    })

    expect(result).toBeNull()
    expect(compareMock).toHaveBeenCalledTimes(1)
    expect(compareMock).toHaveBeenCalledWith('kata-sandi', '$2b$10$hashasliuser')
  })

  it('mengembalikan user saat password valid dan user aktif', async () => {
    findUniqueMock.mockResolvedValue(dbUser())
    compareMock.mockResolvedValue(true)

    const result = await authorize()({
      email: '  ADMIN@An-Nur.Local ',
      password: 'kata-sandi',
    })

    expect(result).toEqual({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@an-nur.local',
      role: 'ADMIN',
    })
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'admin@an-nur.local' },
    })
    expect(compareMock).toHaveBeenCalledWith('kata-sandi', '$2b$10$hashasliuser')
  })

  it('menolak password salah', async () => {
    findUniqueMock.mockResolvedValue(dbUser())
    compareMock.mockResolvedValue(false)

    const result = await authorize()({
      email: 'admin@an-nur.local',
      password: 'salah',
    })

    expect(result).toBeNull()
    expect(compareMock).toHaveBeenCalledTimes(1)
  })

  it('input kosong tidak memicu query maupun compare', async () => {
    const result = await authorize()({ email: '', password: '' })

    expect(result).toBeNull()
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(compareMock).not.toHaveBeenCalled()
  })
})
