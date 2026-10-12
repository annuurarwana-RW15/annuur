import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export interface DailyPageview {
  date: string
  views: number
}

export interface PageViewStats {
  path: string
  views: number
}

export interface ReferrerStats {
  referrer: string
  views: number
}

export interface HourlyView {
  hour: number
  views: number
}

export interface KasMonthlyEntry {
  month: string
  masuk: number
  keluar: number
}

/**
 * Ambil pageview 7/30 hari terakhir dari DB Track.
 * Jika tidak ada data, return fixture default semua nol.
 */
export async function dailyPageviews(days: number): Promise<DailyPageview[]> {
  if (days <= 0) return []

  const rows = await db.track.findMany({
    select: {
      createdAt: true,
    },
    where: {
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (rows.length === 0) {
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const result: DailyPageview[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      result.push({
        date: d.toISOString().split('T')[0],
        views: 0,
      })
    }
    return result
  }

  const grouped = new Map<string, number>()
  for (const row of rows) {
    const dateKey = row.createdAt.toISOString().split('T')[0]
    grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + 1)
  }

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result: DailyPageview[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateKey = d.toISOString().split('T')[0]
    result.push({
      date: dateKey,
      views: grouped.get(dateKey) ?? 0,
    })
  }
  return result
}

/**
 * TOP paths by view count dari Track, sorted desc, limit.
 */
export async function topPages(days: number, limit: number): Promise<PageViewStats[]> {
  if (days <= 0 || limit <= 0) return []

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await db.track.groupBy({
    by: ['path'],
    where: {
      createdAt: {
        gte: cutoff,
      },
    },
    _count: { path: true },
    orderBy: { _count: { path: 'desc' } },
    take: limit,
  })

  return rows.map((row) => ({
    path: row.path,
    views: row._count.path,
  }))
}

/**
 * TOP referrers by view count dari Track, sorted desc, limit.
 */
export async function topReferrers(days: number, limit: number): Promise<ReferrerStats[]> {
  if (days <= 0 || limit <= 0) return []

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await db.track.groupBy({
    by: ['referrer'],
    where: {
      createdAt: {
        gte: cutoff,
        referrer: {
          not: null,
        },
      },
    },
    _count: { referrer: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: limit,
  })

  return rows.map((row) => ({
    referrer: row.referrer ?? 'direct',
    views: row._count.referrer,
  }))
}

/**
 * Group by hour-of-day (0-23) from Track createdAt.
 */
export async function hourlyViews(days: number): Promise<HourlyView[]> {
  if (days <= 0) return []

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await db.track.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: cutoff,
      },
    },
    _count: { createdAt: true },
  })

  const grouped = new Map<number, number>()
  for (const row of rows) {
    const hour = row.createdAt.getUTCHours()
    grouped.set(hour, (grouped.get(hour) ?? 0) + 1)
  }

  const result: HourlyView[] = []
  for (let h = 0; h < 24; h++) {
    result.push({
      hour: h,
      views: grouped.get(h) ?? 0,
    })
  }
  return result
}

/**
 * Kas 6 bulan mundur: {month:string, masuk:number, keluar:number}[]
 * Dari Transaction model (type MASUK/KELUAR, grouped by month).
 * Jika tidak ada data, fallback zeros.
 * @param referenceDate tanggal referensi (default: now). Digunakan untuk testing.
 */
export async function kasMonthly(
  referenceDate?: Date,
): KasMonthlyEntry[] {
  const now = referenceDate ?? new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(now.getMonth() - 6)

  const rows = await db.transaction.groupBy({
    by: ['type', {
      month: {
        gt: sixMonthsAgo,
        lte: now,
      },
    }],
    _sum: {
      amount: true,
    },
    where: {
      date: {
        gte: sixMonthsAgo,
        lte: now,
      },
    },
  })

  const grouped = new Map<string, { masuk: number; keluar: number }>()
  for (let m = 6; m >= 0; m--) {
    const monthDate = new Date()
    monthDate.setMonth(now.getMonth() - m)
    const monthKey = monthDate.toISOString().split('T')[0].slice(0, 7)
    grouped.set(monthKey, { masuk: 0, keluar: 0 })
  }

  for (const row of rows) {
    const monthKey = new Date(row.createdAt).toISOString().split('T')[0].slice(0, 7)
    if (!grouped.has(monthKey)) continue
    const current = grouped.get(monthKey)!
    if (row.type === 'MASUK') {
      grouped.set(monthKey, { ...current, masuk: (current.masuk ?? 0) + Number(row._sum.amount ?? 0) })
    } else {
      grouped.set(monthKey, { ...current, keluar: (current.keluar ?? 0) + Number(row._sum.amount ?? 0) })
    }
  }

  const result: KasMonthlyEntry[] = []
  for (let m = 0; m < 6; m++) {
    const monthDate = new Date()
    monthDate.setMonth(now.getMonth() - m)
    const monthKey = monthDate.toISOString().split('T')[0].slice(0, 7)
    const entry = grouped.get(monthKey) ?? { masuk: 0, keluar: 0 }
    const monthName = monthDate.toLocaleString('id-ID', { month: 'short' })
    result.push({
      month: monthName,
      masuk: entry.masuk,
      keluar: entry.keluar,
    })
  }
  return result
}