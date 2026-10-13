'use client'

import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DailyPageview,
  HourlyView,
  KasMonthlyEntry,
  PageViewStats,
  ReferrerStats,
} from '@/lib/analytics'

export interface AnalyticsData {
  daily: DailyPageview[]
  pages: PageViewStats[]
  referrers: ReferrerStats[]
  hourly: HourlyView[]
  kas: KasMonthlyEntry[]
}

interface AnalyticsChartsProps {
  data: AnalyticsData
  days: 7 | 30 | 90
}

const PERIODS = [7, 30, 90] as const
const HIJAU = '#0f4c3a'
const EMAS = '#c9a227'

const cardClass = 'rounded-xl border border-black/10 bg-white p-5 shadow-sm'
const h2Class = 'text-base font-semibold text-neutral-900'

export function AnalyticsCharts({ data, days }: AnalyticsChartsProps) {
  const totalViews = data.daily.reduce((sum, d) => sum + d.views, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500">Periode:</span>
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/analitik?periode=${p}`}
            className={`rounded-md border px-3 py-1 text-sm font-medium transition ${
              p === days
                ? 'border-green-900 bg-green-900 text-white'
                : 'border-black/10 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {p} hari
          </Link>
        ))}
        <span className="ml-2 text-sm text-neutral-500 tabular-nums">
          {totalViews.toLocaleString('id-ID')} pageview
        </span>
      </div>

      <section className={cardClass}>
        <h2 className={h2Class}>Pageview Harian</h2>
        <div className="mt-4 h-72">
          {data.daily.length === 0 ? (
            <p className="pt-20 text-center text-sm text-neutral-400">
              Belum ada data pengunjung
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HIJAU} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={HIJAU} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Pageview"
                  stroke={HIJAU}
                  fill="url(#viewsFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className={h2Class}>Halaman Teratas</h2>
          {data.pages.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">Belum ada data</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-neutral-500">
                  <th className="py-2 font-medium">Halaman</th>
                  <th className="py-2 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.pages.map((row) => (
                  <tr key={row.path} className="border-b border-black/5">
                    <td className="py-2 font-mono text-xs text-neutral-800">
                      {row.path}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.views.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={cardClass}>
          <h2 className={h2Class}>Referrer Teratas</h2>
          {data.referrers.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">Belum ada data</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-neutral-500">
                  <th className="py-2 font-medium">Referrer</th>
                  <th className="py-2 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.referrers.map((row) => (
                  <tr key={row.referrer} className="border-b border-black/5">
                    <td className="py-2 text-xs text-neutral-800">
                      {row.referrer}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.views.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className={h2Class}>Pageview per Jam</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="views" name="Pageview" fill={HIJAU} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className={h2Class}>Kas Bulanan</h2>
          <div className="mt-4 h-64">
            {data.kas.length === 0 ? (
              <p className="pt-20 text-center text-sm text-neutral-400">
                Belum ada transaksi
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.kas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="masuk" name="Masuk" fill={HIJAU} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keluar" name="Keluar" fill={EMAS} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
