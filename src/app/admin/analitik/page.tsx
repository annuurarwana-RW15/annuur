'use client'

import type { Metadata } from 'next'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { dailyPageviews, topPages, topReferrers, hourlyViews, kasMonthly } from '@/lib/analytics'
import { requireRole } from '@/lib/rbac'
import { DataTable } from '@/components/admin/DataTable'
import { buildCsv } from '@/lib/table-query'
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  Line,
} from 'recharts'
import {
  BarChart,
  Bar,
  XAxis as BarXAxis,
  YAxis as BarYAxis,
  Tooltip as BarTooltip,
  CartesianGrid as BarGrid,
  LabelList,
} from 'recharts'

const TRACK_EMPTY_MSG = 'Tidak ada data penglihatan'

export default function AnalitikPage() {
  await requireRole('ADMIN')

  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [dailyData, setDailyData] = useState<{ date: string; views: number }[]>([])
  const [topPagesData, setTopPagesData] = useState<{ path: string; views: number }[]>([])
  const [topReferrersData, setTopReferrersData] = useState<{ referrer: string; views: number }[]>([])
  const [hourlyData, setHourlyData] = useState<{ hour: number; views: number }[]>([])
  const [kasData, setKasData] = useState<KasMonthlyEntry[]>([])

  useEffect(() => {
    const loadData = async () => {
      const dp = await dailyPageviews(Number(period))
      setDailyData(dp)

      const tp = await topPages(Number(period), 10)
      setTopPagesData(tp)

      const tr = await topReferrers(Number(period), 8)
      setTopReferrersData(tr)

      const hv = await hourlyViews(Number(period))
      setHourlyData(hv)

      const kas = await kasMonthly()
      setKasData(kas)
    }

    loadData()
  }, [period])

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(e.target.value as '7' | '30' | '90')
  }

  const hasData = dailyData.length > 0 || topPagesData.length > 0

  if (!hasData) {
    return <p>{TRACK_EMPTY_MSG}</p>
  }

  // CSV export helpers
  const exportTopPagesCsv = () => {
    const headers = ['Rank', 'Path', 'Views']
    const rows = topPagesData.map((row, i) => [i + 1, truncate(row.path, 60), row.views])
    const csv = buildCsv(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'top-pages-analitik.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportReferrersCsv = () => {
    const headers = ['Referrer', 'Views']
    const rows = topReferrersData.map((row) => [truncate(row.referrer ?? 'direct', 80), row.views])
    const csv = buildCsv(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'referrers-analitik.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Analitik Masjid An-Nur</h1>

      <div className="mb-6">
        <select
          className="rounded-border px-4 py-2 border"
          onChange={handlePeriodChange}
        >
          <option value="7">7 hari</option>
          <option value="30" selected>
            30 hari
          </option>
          <option value="90">90 hari</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* AreaChart: Pageview 7/30 hari */}
        <div>
          <h2 className="text-semibold text-neutral-900 mb-4">
            Pageview {period} hari
          </h2>
          {dailyData.length > 0 ? (
            <AreaChart
              width={600}
              height={300}
              data={dailyData as any}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-0.35} dataMargin={{ top: 0, bottom: 0 }} label={{ value: 'Tanggal' }} />
              <YAxis label={{ value: 'Views' }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} />
              <Line type="monotone" dataKey="views" stroke="#8884d8" fill="none" />
            </AreaChart>
          ) : (
            <p className="text-sm text-neutral-500">{TRACK_EMPTY_MSG}</p>
          )}
        </div>

        {/* DataTable: Halaman terpopuler */}
        <div>
          <h2 className="text-semibold text-neutral-900 mb-4">Halaman Terpopuler</h2>
          {topPagesData.length > 0 ? (
            <DataTable
              columns={[
                { key: 'rank', label: 'Rank', className: 'text-center' },
                { key: 'path', label: 'Path', className: 'font-mono truncate' },
                { key: 'views', label: 'Views', className: 'text-right' },
              ]}
              data={topPagesData.map((row, i) => ({ rank: i + 1, path: row.path, views: row.views }))}
              pagination={false}
              server={false}
              onExportCsv={exportTopPagesCsv}
            />
          ) : (
            <p className="text-sm text-neutral-500">{TRACK_EMPTY_MSG}</p>
          )}
        </div>

        {/* Referrer display */}
        <div>
          <h2 className="text-semibold text-neutral-900 mb-4">Referrer</h2>
          {topReferrersData.length > 0 ? (
            <div className="space-y-2">
              {topReferrersData.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b">
                  <span className="truncate w-64">{row.referrer || 'direct'}</span>
                  <span className="text-right">{row.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{TRACK_EMPTY_MSG}</p>
          )}
        </div>

        {/* Bar chart: jam ramai */}
        <div>
          <h2 className="text-semibold text-neutral-900 mb-4">Jam Ramai</h2>
          {hourlyData.length > 0 ? (
            <BarChart
              width={600}
              height={300}
              data={hourlyData as any}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <BarXAxis dataKey="hour" type="number" domain={['0', 23]} label={{ value: 'Jam' }} />
              <BarYAxis label={{ value: 'Views' }} />
              <BarTooltip />
              <Bar dataKey="views" stroke="#8884d8" fill="#8884d8" />
              <LabelList dataKey="hour" fontSize={12} fill="#8c8c8c" />
            </BarChart>
          ) : (
            <p className="text-sm text-neutral-500">{TRACK_EMPTY_MSG}</p>
          )}
        </div>
      </div>

      {/* Grafik Kas: LineChart masuk/keluar 6 bulan */}
      <div mt-6>
        <h2 className="text-semibold text-neutral-900 mb-4">Grafik Kas 6 Bulan</h2>
        {kasData.length > 0 ? (
          <div className="relative">
            <ChartJS
              notFound
              option={{
                responsive: true,
                maintainAspectRatio: false,
                tooltip: {
                  mode: 'index',
                  intersect: false,
                },
                scales: {
                  x: {
                    display: true,
                    title: { display: true, text: 'Bulan' },
                    bounds: 'data',
                  },
                  y: {
                    display: true,
                    title: { display: true, text: 'Jumlah' },
                  },
                },
              }}
            />
            <ChartJS.Provider
              notFound
              option={{
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Masuk / Keluar 6 Bulan Terakhir',
                  },
                },
                series: kasData.map((entry, i) => ({
                  name: entry.month,
                  data: [entry.masuk, entry.keluar],
                  type: 'line' as const,
                  fill: false,
                  borderColor: i === 0 ? '#8884d8' : '#82ca9d',
                  backgroundColor: i === 0 ? '#8884d8' : '#82ca9d',
                })),
              }}
            >
            </ChartJS.Provider>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{TRACK_EMPTY_MSG}</p>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={exportTopPagesCsv}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 mb-3"
        >
          Export Halaman Terpopuler CSV
        </button>
        <button
          onClick={exportReferrersCsv}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Export Referrer CSV
        </button>
      </div>
    </div>
  )
}

interface KasMonthlyEntry {
  month: string
  masuk: number
  keluar: number
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}