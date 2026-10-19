import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canHit, hit, resetHit, resetRateLimits } from '@/lib/rate-limit'
import {
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_MESSAGE,
  LOGIN_RATE_WINDOW_MS,
} from '@/lib/login-rate-limit'

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

vi.mock('bcryptjs', () => ({ compare: compareMock }))

vi.mock('@/lib/db', () => ({
  db: { user: { findUnique: findUniqueMock } },
}))

import '@/lib/auth'

interface CapturedConfig {
  providers: {
    authorize?: (
      credentials: Record<string, unknown> | undefined,
      request: Request,
    ) => Promise<unknown>
  }[]
}

function authorize(): NonNullable<CapturedConfig['providers'][number]['authorize']> {
  const config = capturedConfig.config as CapturedConfig
  const provider = config.providers[0]
  if (!provider?.authorize) throw new Error('authorize tidak ditemukan')
  return provider.authorize
}

function req(ip = '203.0.113.77'): Request {
  return new Request('http://localhost/api/auth/callback/credentials', {
    headers: { 'x-real-ip': ip },
  })
}

const CREDENTIALS = { email: 'admin@an-nur.local', password: 'salah' }

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

describe('primitif rate-limit', () => {
  beforeEach(() => resetRateLimits())
  afterEach(() => vi.useRealTimers())

  it('canHit true tanpa entry, false setelah limit terlampaui', () => {
    const key = 'uji:a'
    for (let i = 0; i < LOGIN_RATE_LIMIT; i += 1) {
      expect(canHit(key, LOGIN_RATE_LIMIT)).toBe(true)
      hit(key, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS)
    }
    expect(canHit(key, LOGIN_RATE_LIMIT)).toBe(false)
  })

  it('canHit tidak menambah hitungan', () => {
    const key = 'uji:b'
    hit(key, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS)
    for (let i = 0; i < 20; i += 1) {
      expect(canHit(key, LOGIN_RATE_LIMIT)).toBe(true)
    }
    expect(canHit(key, LOGIN_RATE_LIMIT)).toBe(true)
  })

  it('resetHit mengosongkan satu key tanpa menyentuh key lain', () => {
    hit('uji:c', 1, LOGIN_RATE_WINDOW_MS)
    hit('uji:d', 1, LOGIN_RATE_WINDOW_MS)
    resetHit('uji:c')

    expect(canHit('uji:c', 1)).toBe(true)
    expect(canHit('uji:d', 1)).toBe(false)
  })

  it('window kedaluwarsa membuka kembali akses', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const key = 'uji:e'
    hit(key, 1, 1_000)
    expect(canHit(key, 1)).toBe(false)

    vi.setSystemTime(1_001)
    expect(canHit(key, 1)).toBe(true)
  })
})

describe('authorize menegakkan rate-limit login', () => {
  beforeEach(() => {
    compareMock.mockReset()
    findUniqueMock.mockReset()
    resetRateLimits()
    findUniqueMock.mockResolvedValue(dbUser())
    compareMock.mockResolvedValue(false)
  })

  it('menolak percobaan ke-6 tanpa menyentuh database', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT; i += 1) {
      expect(await authorize()(CREDENTIALS, req())).toBeNull()
    }
    expect(findUniqueMock).toHaveBeenCalledTimes(LOGIN_RATE_LIMIT)

    findUniqueMock.mockClear()
    expect(await authorize()(CREDENTIALS, req())).toBeNull()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('login berhasil me-reset window sehingga tidak terkunci', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT - 1; i += 1) {
      await authorize()(CREDENTIALS, req())
    }

    compareMock.mockResolvedValue(true)
    expect(await authorize()(CREDENTIALS, req())).toMatchObject({
      id: 'user-1',
    })

    compareMock.mockResolvedValue(false)
    for (let i = 0; i < LOGIN_RATE_LIMIT - 1; i += 1) {
      expect(await authorize()(CREDENTIALS, req())).toBeNull()
    }
  })

  it('window terpisah per IP', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT; i += 1) {
      await authorize()(CREDENTIALS, req('203.0.113.1'))
    }

    findUniqueMock.mockClear()
    expect(await authorize()(CREDENTIALS, req('203.0.113.2'))).toBeNull()
    expect(findUniqueMock).toHaveBeenCalledTimes(1)
  })

  it('user nonaktif ikut dihitung sebagai kegagalan', async () => {
    findUniqueMock.mockResolvedValue(dbUser({ isActive: false }))
    compareMock.mockResolvedValue(true)

    for (let i = 0; i < LOGIN_RATE_LIMIT; i += 1) {
      expect(await authorize()(CREDENTIALS, req())).toBeNull()
    }

    findUniqueMock.mockClear()
    expect(await authorize()(CREDENTIALS, req())).toBeNull()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('input kosong tidak menghitung kegagalan', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT * 2; i += 1) {
      expect(await authorize()({ email: '', password: '' }, req())).toBeNull()
    }
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(canHit('login:203.0.113.77', LOGIN_RATE_LIMIT)).toBe(true)
  })

  it('pesan limit memakai jendela yang sama dengan kebijakan', () => {
    expect(LOGIN_RATE_MESSAGE).toContain('15 menit')
    expect(LOGIN_RATE_WINDOW_MS).toBe(15 * 60_000)
    expect(LOGIN_RATE_LIMIT).toBe(5)
  })
})
