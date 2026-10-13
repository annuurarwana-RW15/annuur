import { dailyPageviews, topPages } from '@/lib/analytics'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  trackFindManyMock: vi.fn(),
  trackGroupByMock: vi.fn(),
  txGroupByMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    track: {
      findMany: h.trackFindManyMock,
      groupBy: h.trackGroupByMock,
    },
    transaction: { groupBy: h.txGroupByMock },
  },
}))

const NOW = new Date('2026-10-13T12:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dailyPageviews', () => {
  it('mengelompokkan fixture per hari dalam jendela 7 hari', async () => {
    h.trackFindManyMock.mockResolvedValue([
      { createdAt: new Date('2026-10-07T10:00:00Z') },
      { createdAt: new Date('2026-10-08T10:00:00Z') },
      { createdAt: new Date('2026-10-08T15:00:00Z') },
      { createdAt: new Date('2026-10-09T10:00:00Z') },
      { createdAt: new Date('2026-10-10T10:00:00Z') },
      { createdAt: new Date('2026-10-11T10:00:00Z') },
      { createdAt: new Date('2026-10-12T10:00:00Z') },
    ])

    const result = await dailyPageviews(7)

    expect(result).toHaveLength(7)
    expect(result[0]).toEqual({ date: '2026-10-06', views: 0 })
    expect(result[1]).toEqual({ date: '2026-10-07', views: 1 })
    expect(result[2]).toEqual({ date: '2026-10-08', views: 2 })
    expect(result[3]).toEqual({ date: '2026-10-09', views: 1 })
    expect(result[4]).toEqual({ date: '2026-10-10', views: 1 })
    expect(result[5]).toEqual({ date: '2026-10-11', views: 1 })
    expect(result[6]).toEqual({ date: '2026-10-12', views: 1 })
  })

  it('days ≤ 0 → []', async () => {
    expect(await dailyPageviews(0)).toEqual([])
    expect(await dailyPageviews(-5)).toEqual([])
  })
})

describe('topPages', () => {
  it('empty returns empty array', async () => {
    h.trackGroupByMock.mockResolvedValue([])
    expect(await topPages(7, 3)).toEqual([])
  })

  it('maps groupBy rows to {path, views}', async () => {
    h.trackGroupByMock.mockResolvedValue([
      { path: '/', _count: { path: 42 } },
      { path: '/donasi', _count: { path: 7 } },
    ])
    const result = await topPages(7, 3)
    expect(result).toEqual([
      { path: '/', views: 42 },
      { path: '/donasi', views: 7 },
    ])
  })
})
