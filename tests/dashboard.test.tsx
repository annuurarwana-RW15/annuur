import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AdminDashboardPage from '@/app/admin/(dashboard)/page'

// `globals` nonaktif di vitest.config -> auto-cleanup testing-library ikut matif.
afterEach(cleanup)

const h = vi.hoisted(() => ({
  articleCount: vi.fn(),
  donationGroupBy: vi.fn(),
  userCount: vi.fn(),
  dailyPageviews: vi.fn(),
  getActivePeriod: vi.fn(),
  getPeriodBalance: vi.fn(),
  getDayFlow: vi.fn(),
  listRecentTransactions: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/admin',
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    article: { count: h.articleCount },
    donation: { groupBy: h.donationGroupBy },
    user: { count: h.userCount },
  },
}))

vi.mock('@/lib/rbac', () => ({
  requireRole: vi.fn().mockResolvedValue({ id: 'u1', name: 'Admin', role: 'ADMIN' }),
}))

vi.mock('@/lib/analytics', () => ({ dailyPageviews: h.dailyPageviews }))

vi.mock('@/lib/kas', () => ({
  getActivePeriod: h.getActivePeriod,
  getPeriodBalance: h.getPeriodBalance,
  getDayFlow: h.getDayFlow,
  listRecentTransactions: h.listRecentTransactions,
}))

const PERIOD = {
  id: 'p-2026',
  name: '2026',
  status: 'AKTIF' as const,
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 11, 31),
}

const RECENT = [
  {
    id: 'tx-1',
    type: 'MASUK' as const,
    amount: 150_000,
    date: new Date(2026, 9, 18),
    description: 'Infak jamaah Jumat',
    receiptImage: null,
    createdAt: new Date(2026, 9, 18),
    category: { id: 'c-infaq', name: 'Infak', color: '#0f4c3a' },
    categoryName: 'Infak',
    categoryColor: '#0f4c3a',
  },
  {
    id: 'tx-2',
    type: 'KELUAR' as const,
    amount: 50_000,
    date: new Date(2026, 9, 17),
    description: 'Santunan anak yatim',
    receiptImage: null,
    createdAt: new Date(2026, 9, 17),
    category: { id: 'c-sosial', name: 'Sosial', color: '#b91c1c' },
    categoryName: 'Sosial',
    categoryColor: '#b91c1c',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  h.articleCount.mockResolvedValue(3)
  h.donationGroupBy.mockResolvedValue([
    { status: 'MENUNGGU', _count: { _all: 2 } },
    { status: 'DIKONFIRMASI', _count: { _all: 10 } },
  ])
  h.userCount.mockResolvedValue(4)
  h.dailyPageviews.mockResolvedValue(
    Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${12 + i}`, views: (i + 1) * 10 })),
  )
  h.getActivePeriod.mockResolvedValue(PERIOD)
  h.getPeriodBalance.mockResolvedValue({ masuk: 500_000, keluar: 300_000, saldo: 200_000 })
  h.getDayFlow.mockResolvedValue({ masuk: 150_000, keluar: 50_000 })
  h.listRecentTransactions.mockResolvedValue(RECENT)
})

function card(label: string): HTMLElement {
  const el = screen.getByText(label, { exact: true }).closest('a')
  expect(el, `kartu "${label}" harus ada`).not.toBeNull()
  return el as HTMLElement
}

describe('AdminDashboardPage — Task 20 Step 4', () => {
  it('kartu Artikel menghitung DRAFT, bukan total seluruh artikel', async () => {
    render(await AdminDashboardPage())

    expect(h.articleCount).toHaveBeenCalledWith({ where: { status: 'DRAFT' } })
    const el = card('Artikel')
    expect(el).toHaveTextContent('3')
    expect(el).toHaveTextContent('Draft')
  })

  it('kartu Saldo Kas menampilkan ringkasan hari ini, dan periode tetap terbaca di subjudul', async () => {
    render(await AdminDashboardPage())

    const el = card('Saldo Kas')
    expect(el).toHaveTextContent('Hari ini:')
    expect(el).toHaveTextContent('Rp 150.000')
    expect(el).toHaveTextContent('Rp 50.000')
    // Label periode tidak hilang — pindah ke subjudul.
    expect(screen.getByText(/Periode 2026/)).toBeInTheDocument()
  })

  it('tiga kartu lain tetap utuh (Donasi Menunggu, Pageview, Pengguna Aktif)', async () => {
    render(await AdminDashboardPage())

    expect(card('Donasi Menunggu')).toHaveTextContent('2')
    expect(card('Pageview')).toHaveTextContent('280')
    expect(card('Pengguna Aktif')).toHaveTextContent('4')
  })

  it('sparkline pageview 7 hari dirender (tanpa ResponsiveContainer/ResizeObserver)', async () => {
    render(await AdminDashboardPage())

    expect(h.dailyPageviews).toHaveBeenCalledWith(7)
    const chart = screen.getByRole('img', { name: /pageview 7 hari/i })
    expect(chart).toBeInTheDocument()
    expect(chart.querySelectorAll('polyline, path').length).toBeGreaterThan(0)
  })

  it('tabel transaksi terbaru menampilkan baris terbaru dari periode aktif', async () => {
    render(await AdminDashboardPage())

    expect(h.listRecentTransactions).toHaveBeenCalledWith('p-2026', 5)
    expect(screen.getByText('Transaksi terbaru')).toBeInTheDocument()
    expect(screen.getByText('Infak jamaah Jumat')).toBeInTheDocument()
    expect(screen.getByText('Santunan anak yatim')).toBeInTheDocument()
  })

  it('tanpa periode aktif: kartu saldo & tabel kosong tanpa error render', async () => {
    h.getActivePeriod.mockResolvedValue(null)
    h.getPeriodBalance.mockResolvedValue(null)
    h.listRecentTransactions.mockResolvedValue([])

    render(await AdminDashboardPage())

    expect(card('Saldo Kas')).toHaveTextContent('—')
    expect(screen.getByText(/Tidak ada periode aktif/)).toBeInTheDocument()
  })
})
