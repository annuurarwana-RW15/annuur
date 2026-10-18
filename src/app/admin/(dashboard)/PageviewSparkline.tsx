interface DailyPageviewPoint {
  date: string
  views: number
}

const W = 320
const H = 56
const PAD = 4

/**
 * Sparkline pageview tanpa pustaka: `ResponsiveContainer` recharts memerlukan
 * `ResizeObserver` yang tidak ada di jsdom, dan untuk garis 7 titik tanpa
 * sumbu/legenda recharts justru berlebihan.
 */
export function PageviewSparkline({ data }: { data: DailyPageviewPoint[] }) {
  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const max = Math.max(0, ...data.map((d) => d.views))

  const xAt = (i: number) =>
    data.length <= 1 ? W / 2 : PAD + (i * innerW) / (data.length - 1)
  const yAt = (views: number) =>
    max > 0 ? PAD + innerH - (views / max) * innerH : PAD + innerH

  const points = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.views).toFixed(1)}`)

  if (data.length === 0) {
    return (
      <p className="text-xs text-neutral-400">Belum ada data pageview 7 hari.</p>
    )
  }

  return (
    <svg
      role="img"
      aria-label="Tren pageview 7 hari"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
    >
      <polygon
        points={`${PAD},${PAD + innerH} ${points.join(' ')} ${W - PAD},${PAD + innerH}`}
        className="fill-green-900/10"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-green-900"
      />
    </svg>
  )
}
