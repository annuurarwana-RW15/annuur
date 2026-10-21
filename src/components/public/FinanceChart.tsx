'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatRupiah, formatRupiahCompact } from '@/lib/format'
import type { DailyFlowPoint } from '@/lib/kas-daily'

const HIJAU = '#0f4c3a'
const EMAS = '#c9a227'
const TOTAL = '#334155'

interface LegendChip {
  label: string
  kind: 'bar' | 'line'
  color: string
}

const LEGEND: LegendChip[] = [
  { label: 'Masuk', kind: 'bar', color: HIJAU },
  { label: 'Keluar', kind: 'bar', color: EMAS },
  { label: 'Total', kind: 'line', color: TOTAL },
]

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  month,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  month?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const rows = [
    { key: 'masuk', name: 'Masuk' },
    { key: 'keluar', name: 'Keluar' },
    { key: 'total', name: 'Total' },
  ].filter((row) => payload.some((entry) => entry.dataKey === row.key))

  return (
    <div className="rounded-lg border border-emas/40 bg-hijau px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-semibold text-emas-muda">
        Hari {label} {month}
      </p>
      {rows.map((row) => {
        const entry = payload.find((item) => item.dataKey === row.key)
        return (
          <p
            key={row.key}
            className="flex items-center justify-between gap-4 text-xs text-krem"
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry?.color }}
              />
              {row.name}
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatRupiah(Number(entry?.value ?? 0))}
            </span>
          </p>
        )
      })}
    </div>
  )
}

/**
 * Chart arus kas harian bulan berjalan (batang Masuk/Keluar + garis Total)
 * dalam kartu ringkas untuk section Laporan Keuangan.
 */
export function FinanceChart({
  points,
  bulan,
}: {
  points: DailyFlowPoint[]
  bulan: string
}) {
  const hasData = points.some((point) => point.masuk > 0 || point.keluar > 0)
  // Cukup ~6 label di sumbu X agar compact & tidak bertumpuk di layar kecil.
  const tickInterval = Math.max(0, Math.ceil(points.length / 6) - 1)

  return (
    <figure className="rounded-2xl border border-emas/20 bg-white/90 p-4 shadow-sm">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Arus Kas Harian
          </h3>
          <p className="text-xs text-neutral-500">{bulan}</p>
        </div>
        <ul className="flex items-center gap-3">
          {LEGEND.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600"
            >
              {item.kind === 'bar' ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: item.color }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-3.5 rounded"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      </figcaption>

      <div className="mt-3 h-44 sm:h-48">
        {!hasData ? (
          <p className="pt-16 text-center text-sm text-neutral-500">
            Belum ada transaksi bulan ini
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ececec" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#737373' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e5e5' }}
                interval={tickInterval}
              />
              <YAxis
                width={44}
                tick={{ fontSize: 10, fill: '#737373' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatRupiahCompact}
              />
              <Tooltip
                content={<ChartTooltip month={bulan} />}
                cursor={{ fill: 'rgba(15, 76, 58, 0.06)' }}
              />
              <Bar
                dataKey="masuk"
                name="Masuk"
                fill={HIJAU}
                radius={[3, 3, 0, 0]}
                barSize={10}
              />
              <Bar
                dataKey="keluar"
                name="Keluar"
                fill={EMAS}
                radius={[3, 3, 0, 0]}
                barSize={10}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={TOTAL}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </figure>
  )
}
