import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  periodFindFirstMock: vi.fn(),
  txGroupByMock: vi.fn(),
  txFindManyMock: vi.fn(),
  settingFindUniqueMock: vi.fn(),
  trackFindManyMock: vi.fn(),
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
    period: { findFirst: h.periodFindFirstMock },
    transaction: {
      groupBy: h.txGroupByMock,
      findMany: h.txFindManyMock,
    },
    setting: { findUnique: h.settingFindUniqueMock },
    track: {
      findMany: h.trackFindManyMock,
      groupBy: h.txGroupByMock,
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

import { dailyPageviews, topPages, topReferrers, hourlyViews, kasMonthly } from '@/lib/analytics'

describe('dailyPageviews', () => {
  it('fixture rows + expected dailyPageviews(7) → dates array + view counts match', async () => {
    h.trackFindManyMock.mockResolvedValue([
      { createdAt: new Date('2026-10-01') },
      { createdAt: new Date('2026-10-01') },
      { createdAt: new Date('2026-10-02') },
      { createdAt: new Date('2026-10-03') },
      { createdAt: new Date('2026-10-03') },
      { createdAt: new Date('2026-10-03') },
      { createdAt: new Date('2026-10-05') },
      { createdAt: new Date('2026-10-07') },
      { createdAt: new Date('2026-10-07') },
      { createdAt: new Date('2026-10-07') },
    ])

    const result = await dailyPageviews(7)

    expect(result).toHaveLength(7)
    expect(result[0]).toEqual({ date: '2026-10-05', views: 1 })
    expect(result[1]).toEqual({ date: '2026-10-06', views: 0 })
    expect(result[2]).toEqual({ date: '2026-10-07', views: 3 })
    expect(result[3]).toEqual({ date: '2026-10-08', views: 0 })
    expect(result[4]).toEqual({ date: '2026-10-09', views: 0 })
    expect(result[5]).toEqual({ date: '2026-10-10', views: 0 })
    expect(result[6]).toEqual({ date: '2026-10-11', views: 0 })
  })

  it('days ≤ 0 → []', async () => {
    const result = await dailyPageviews(0)
    expect(result).toEqual([])

    const result2 = await dailyPageviews(-5)
    expect(result2).toEqual([])
  })
})

describe('topPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('top 3 paths by view count, correct order', async () => {
    h.txGroupByMock.mockResolvedValue([
      { path: '/berat', _count: { path: 10 } },
      { path: '/', _count: { path: 7 } },
      { path: '/kontak', _count: { path: 3 } },
    ])

    const result = await topPages(7, 3)

    expect(result).toHaveLength(3)
    expect(result[0].path).toBe('/berat')
    expect(result[0].views).toBe(10)
    expect(result[1].path).toBe('/')
    expect(result[1].views).toBe(7)
    expect(result[2].path).toBe('/kontak')
    expect(result[2].views).toBe(3)
  })

  it('days ≤ 0 → []', async () => {
    const result = await topPages(0, 3)
    expect(result).toEqual([])

    const result2 = await topPages(7, 0)
    expect(result2).toEqual([])
  })
})

describe('topReferrers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('top 3 referrers', async () => {
    h.txGroupByMock.mockResolvedValue([
      { referrer: 'https://google.com', _count: { referrer: 15 } },
      { referrer: 'https://twitter.com', _count: { referrer: 8 } },
      { referrer: 'https://facebook.com', _count: { referrer: 5 } },
    ])

    const result = await topReferrers(7, 3)

    expect(result).toHaveLength(3)
    expect(result[0].referrer).toBe('https://google.com')
    expect(result[0].views).toBe(15)
    expect(result[1].referrer).toBe('https://twitter.com')
    expect(result[1].views).toBe(8)
    expect(result[2].referrer).toBe('https://facebook.com')
    expect(result[2].views).toBe(5)
  })

  it('null referrer → "direct"', async () => {
    h.txGroupByMock.mockResolvedValue([
      { referrer: null, _count: { referrer: 2 } },
    ])

    const result = await topReferrers(7, 3)

    expect(result[0].referrer).toBe('direct')
    expect(result[0].views).toBe(2)
  })

  it('days ≤ 0 → []', async () => {
    const result = await topReferrers(0, 3)
    expect(result).toEqual([])
  })
})

describe('hourlyViews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('24 entries (some zero), hour 0-23', async () => {
    h.txGroupByMock.mockResolvedValue([
      { createdAt: new Date('2026-10-12T00:00:00Z') },
      { createdAt: new Date('2026-10-12T00:00:00Z') },
      { createdAt: new Date('2026-10-12T12:00:00Z') },
    ])

    const result = await hourlyViews(7)

    expect(result).toHaveLength(24)
    expect(result[0].views).toBe(2)
    expect(result[12].views).toBe(1)
    expect(result[23].views).toBe(0)
  })

  it('days ≤ 0 → []', async () => {
    const result = await hourlyViews(0)
    expect(result).toEqual([])
  })
})

describe('kasMonthly', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('6 months back from now, correct ascending/descending order, correct masuk/keluar per month', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: 500000 }, createdAt: new Date('2026-06-01') },
      { type: 'MASUK', _sum: { amount: 300000 }, createdAt: new Date('2026-05-01') },
      { type: 'KELUAR', _sum: { amount: 200000 }, createdAt: new Date('2026-06-15') },
      { type: 'KELUAR', _sum: { amount: 100000 }, createdAt: new Date('2026-05-20') },
    ])

    const result = await kasMonthly(new Date('2026-06-15T12:00:00Z'))

    expect(result).toHaveLength(6)
    expect(result[0].month).toBe('Jun')
    expect(result[0].masuk).toBe(500000)
    expect(result[0].keluar).toBe(200000)
    expect(result[5].month).toBe('Jan')
  })

  it('fallback zeros when no data', async () => {
    h.txGroupByMock.mockResolvedValue([])

    const result = await kasMonthly(new Date('2026-06-15T12:00:00Z'))

    expect(result).toHaveLength(6)
    expect(result.every((r) => r.masuk === 0 && r.keluar === 0)).toBe(true)
  })
})