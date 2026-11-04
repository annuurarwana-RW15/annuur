import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { dailyPageviews } from '@/lib/analytics'
import { db } from '@/lib/db'
import { formatRupiah } from '@/lib/format'
import {
  getActivePeriod,
  getDayFlow,
  getPeriodBalance,
  listRecentTransactions,
} from '@/lib/kas'
import { requireRole } from '@/lib/rbac'
import { ensureDefaultSections } from '@/lib/sections-init'
import { PageviewSparkline } from './PageviewSparkline'
import { RecentTransactions } from './RecentTransactions'

const RECENT_LIMIT = 5

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

  const [period, donationByStatus, draftCount, activeUserCount, daily, defaultSections] =
    await Promise.all([
      getActivePeriod(),
      db.donation.groupBy({ by: ['status'], _count: { _all: true } }),
      // Kartu "Artikel" = jumlah DRAFT (yang menunggu tayang), bukan total.
      db.article.count({ where: { status: 'DRAFT' } }),
      db.user.count({ where: { isActive: true } }),
      dailyPageviews(7),
      ensureDefaultSections(),
    ])

  const [balance, dayFlow, recent] = await Promise.all([
    period ? getPeriodBalance(period.id) : Promise.resolve(null),
    period ? getDayFlow(period.id) : Promise.resolve({ masuk: 0, keluar: 0 }),
    period ? listRecentTransactions(period.id, RECENT_LIMIT) : Promise.resolve([]),
  ])

  const pendingDonations =
    donationByStatus.find((row) => row.status === 'MENUNGGU')?._count._all ?? 0
  const views7 = daily.reduce((sum, day) => sum + day.views, 0)

  const cards = [
    {
      label: 'Saldo Kas',
      value: balance ? formatRupiah(balance.saldo) : '—',
      hint: period
        ? `Hari ini: masuk ${formatRupiah(dayFlow.masuk)} · keluar ${formatRupiah(dayFlow.keluar)}`
        : 'Tidak ada periode aktif',
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
      value: String(draftCount),
      hint: 'Draft',
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
        Ringkasan aktivitas masjid{period ? ` — Periode ${period.name}.` : '.'}
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Pageview 7 hari</h2>
          <div className="mt-4">
            <PageviewSparkline data={daily} />
          </div>
        </section>
        <div className="lg:col-span-2">
          <RecentTransactions rows={recent} />
        </div>
      </div>

      {/* Pintasan Kelola Media Sosial Footer & Widget Beranda */}
      <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Pengelolaan Media Sosial &amp; Widget Beranda
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Pintasan cepat untuk mengatur tautan media sosial di footer dan widget konten publik.
            </p>
          </div>
          <Link
            href="/admin/sections"
            className="text-xs font-semibold text-green-900 hover:text-green-700"
          >
            Semua Section →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-4 transition hover:border-green-900/30 hover:bg-neutral-50">
            <div>
              <div className="flex items-center gap-2 text-green-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm">
                  🌐
                </span>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Media Sosial Footer
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Kelola tautan media sosial resmi (Instagram, TikTok, YouTube, WhatsApp, dll) yang tampil pada footer situs publik.
              </p>
            </div>
            <div className="mt-4 border-t border-black/5 pt-3">
              <Link
                href={
                  defaultSections.footerId
                    ? `/admin/sections?edit=${defaultSections.footerId}`
                    : '/admin/sections'
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-900 hover:text-green-700"
              >
                <span>Kelola Link Sosial Media Footer</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-4 transition hover:border-green-900/30 hover:bg-neutral-50">
            <div>
              <div className="flex items-center gap-2 text-green-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm">
                  📱
                </span>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Widget Feed TikTok Official
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Atur username akun official (@masjidannuurarwana) dan sematan video dakwah TikTok di beranda situs.
              </p>
            </div>
            <div className="mt-4 border-t border-black/5 pt-3">
              <Link
                href={
                  defaultSections.tiktokId
                    ? `/admin/sections?edit=${defaultSections.tiktokId}`
                    : '/admin/sections'
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-900 hover:text-green-700"
              >
                <span>Atur Widget Feed TikTok</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
