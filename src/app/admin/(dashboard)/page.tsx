import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { dailyPageviews } from '@/lib/analytics'
import { db } from '@/lib/db'
import { formatRupiah } from '@/lib/format'
import { getActivePeriod, getPeriodBalance } from '@/lib/kas'
import { requireRole } from '@/lib/rbac'

export const metadata: Metadata = {
  title: 'Dashboard — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function AdminDashboardPage() {
  const sessionUser = await requireRole(
    'ADMIN',
    'BENDAHARA',
    'KONTEN',
    'VIEWER'
  )
  if (sessionUser.role === 'VIEWER') redirect('/admin/analitik')

  const [period, donationByStatus, articleCount, activeUserCount, daily] =
    await Promise.all([
      getActivePeriod(),
      db.donation.groupBy({ by: ['status'], _count: { _all: true } }),
      db.article.count(),
      db.user.count({ where: { isActive: true } }),
      dailyPageviews(7),
    ])

  const balance = period ? await getPeriodBalance(period.id) : null
  const pendingDonations =
    donationByStatus.find((row) => row.status === 'MENUNGGU')?._count._all ?? 0
  const views7 = daily.reduce((sum, day) => sum + day.views, 0)

  const cards = [
    {
      label: 'Saldo Kas',
      value: balance ? formatRupiah(balance.saldo) : '—',
      hint: period ? `Periode ${period.name}` : 'Tidak ada periode aktif',
      href: '/admin/kas/laporan',
    },
    {
      label: 'Donasi Menunggu',
      value: String(pendingDonations),
      hint: 'Menunggu verifikasi',
      href: '/admin/donasi',
    },
    {
      label: 'Pageview',
      value: String(views7),
      hint: '7 hari terakhir',
      href: '/admin/analitik',
    },
    {
      label: 'Artikel',
      value: String(articleCount),
      hint: 'Total artikel',
      href: '/admin/artikel',
    },
    {
      label: 'Pengguna Aktif',
      value: String(activeUserCount),
      hint: 'Akun aktif',
      href: '/admin/pengguna',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ringkasan aktivitas masjid.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-green-900/30 hover:shadow"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-neutral-400">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
