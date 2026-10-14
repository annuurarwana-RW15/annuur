import { db } from '@/lib/db'

/** Zona waktu tampilan laporan (WIB) — bucket harian & jam ramai tidak lagi UTC. */
const APP_TZ = 'Asia/Jakarta'

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TZ,
  hour: '2-digit',
  hourCycle: 'h23',
})

/** Kunci tanggal `YYYY-MM-DD` menurut APP_TZ (bukan UTC). */
function tzDateKey(date: Date): string {
  return dateKeyFormatter.format(date)
}

/** Jam 0-23 menurut APP_TZ (bukan UTC). */
function tzHour(date: Date): number {
  return Number(hourFormatter.format(date))
}

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

/**
 * Ambil pageview 7/30 hari terakhir dari DB Track (bucket per hari WIB).
 * Jika tidak ada data, return deret tanggal semua nol.
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
        date: tzDateKey(d),
        views: 0,
      })
    }
    return result
  }

  const grouped = new Map<string, number>()
  for (const row of rows) {
    const dateKey = tzDateKey(row.createdAt)
    grouped.set(dateKey, (grouped.get(dateKey) ?? 0) + 1)
  }

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result: DailyPageview[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateKey = tzDateKey(d)
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
      createdAt: { gte: cutoff },
    },
    _count: { referrer: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: limit,
  })

  return rows.map((row) => ({
    referrer: row.referrer ?? 'direct',
    views: row._count?.referrer ?? 0,
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
    const hour = tzHour(row.createdAt)
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

export type { KasMonth as KasMonthlyEntry } from '@/lib/kas'
