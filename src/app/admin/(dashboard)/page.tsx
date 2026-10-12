import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Admin Masjid An-Nur Arwana',
  robots: { index: false, follow: false },
}

const PLACEHOLDER_CARDS = [
  { label: 'Saldo', hint: 'Saldo kas terkini' },
  { label: 'Donasi Menunggu', hint: 'Menunggu verifikasi' },
  { label: 'Pageview', hint: '7 hari terakhir' },
  { label: 'Artikel', hint: 'Total artikel' },
]

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ringkasan aktivitas masjid.
      </p>

      {/* data kartu diisi Task 20 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLACEHOLDER_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900">—</p>
            <p className="mt-1 text-xs text-neutral-400">{card.hint}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
