import type { Metadata } from 'next'
import {
  dailyPageviews,
  hourlyViews,
  topPages,
  topReferrers,
} from '@/lib/analytics'
import { kasMonthly } from '@/lib/kas'
import { requireRole } from '@/lib/rbac'
import { AnalyticsCharts, type AnalyticsData } from './AnalyticsCharts'

export const metadata: Metadata = {
  title: 'Analitik — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function asDays(value: string | string[] | undefined): 7 | 30 | 90 {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === '7' || raw === '30' || raw === '90') return Number(raw) as 7 | 30 | 90
  return 30
}

export default async function AnalitikPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA', 'VIEWER')

  const sp = await searchParams
  const days = asDays(sp.periode)

  const [daily, pages, referrers, hourly, kas] = await Promise.all([
    dailyPageviews(days),
    topPages(days, 10),
    topReferrers(days, 8),
    hourlyViews(days),
    kasMonthly(),
  ])

  const data: AnalyticsData = { daily, pages, referrers, hourly, kas }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Analitik</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pengunjung situs dan arus kas bulanan.
      </p>
      <div className="mt-6">
        <AnalyticsCharts data={data} days={days} />
      </div>
    </div>
  )
}
