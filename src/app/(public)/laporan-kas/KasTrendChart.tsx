'use client'

import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatRupiah } from '@/lib/format'
import type { PublicTrendPoint } from './trend'

const HIJAU = '#0f4c3a'
const EMAS = '#c9a227'
const SALDO = '#334155'

const WINDOWS = [6, 12] as const
type WindowMonths = (typeof WINDOWS)[number]

/** Format ringkas untuk sumbu Y (angka rupiah bisa sangat besar). */
function compactRupiah(value: number | string): string {
  const num = Number(value)
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  }
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  }
  if (abs >= 1_000) {
    return `${(num / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  }
  return num.toLocaleString('id-ID')
}

/**
 * Grafik tren kas publik: batang Masuk/Keluar + garis saldo kumulatif.
 *
 * Data 12 bulan dikirim sekali dari server; tombol 6/12 bulan hanya memotong
 * array di sisi klien sehingga tanpa navigasi ulang.
 */
export function KasTrendChart({ points }: { points: PublicTrendPoint[] }) {
  const [months, setMonths] = useState<WindowMonths>(6)
  const data = points.slice(-months)
  const hasData = data.some((point) => point.masuk > 0 || point.keluar > 0)

  return (
    <section className="rounded-xl border border-emas/20 bg-white/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900">
          Tren Kas {months} Bulan
        </h3>
        <div className="flex gap-1" role="group" aria-label="Rentang tren">
          {WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              onClick={() => setMonths(window)}
              aria-pressed={months === window}
              className={`rounded-md border px-3 py-1 text-sm font-medium transition ${
                months === window
                  ? 'border-hijau bg-hijau text-krem'
                  : 'border-black/10 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {window} bulan
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72">
        {!hasData ? (
          <p className="pt-24 text-center text-sm text-hijau-tua/60">
            Belum ada transaksi pada rentang ini
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={compactRupiah} />
              <Tooltip
                formatter={(value) => formatRupiah(Number(value))}
                labelFormatter={(label) => `Bulan ${label}`}
              />
              <Legend />
              <Bar dataKey="masuk" name="Masuk" fill={HIJAU} radius={[4, 4, 0, 0]} />
              <Bar dataKey="keluar" name="Keluar" fill={EMAS} radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo kumulatif"
                stroke={SALDO}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
