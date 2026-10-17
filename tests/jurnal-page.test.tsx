import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { LaporanTabs } from '@/app/admin/(dashboard)/kas/laporan/LaporanTabs'
import JurnalKasPage from '@/app/admin/(dashboard)/kas/laporan/jurnal/page'

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/admin/kas/laporan/jurnal',
  url: '',
  db: {
    period: { findUnique: vi.fn(), findMany: vi.fn() },
    category: { findMany: vi.fn() },
    transaction: { findMany: vi.fn(), groupBy: vi.fn() },
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: h.replace }),
  useSearchParams: () => new URLSearchParams(h.url),
  usePathname: () => h.pathname,
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('@/lib/db', () => ({ db: h.db }))

vi.mock('@/lib/rbac', () => ({
  requireRole: vi.fn().mockResolvedValue({ id: 'u1', name: 'Admin', role: 'ADMIN' }),
}))

const PERIOD = {
  id: 'p-2026',
  name: '2026',
  status: 'AKTIF' as const,
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 11, 31),
}

const CATEGORIES = [
  { id: 'cat-infak', name: 'Infak' },
  { id: 'cat-sosial', name: 'Sosial' },
]

const TRANSACTIONS = [
  {
    id: 't1',
    date: new Date(2026, 9, 1),
    createdAt: new Date(2026, 9, 1),
    description: 'Infak awal',
    type: 'MASUK' as const,
    amount: 100_000,
    category: { id: 'cat-infak', name: 'Infak' },
  },
  {
    id: 't2',
    date: new Date(2026, 9, 2),
    createdAt: new Date(2026, 9, 2),
    description: 'Santunan anak yatim',
    type: 'KELUAR' as const,
    amount: 30_000,
    category: { id: 'cat-sosial', name: 'Sosial' },
  },
  {
    id: 't3',
    date: new Date(2026, 9, 3),
    createdAt: new Date(2026, 9, 3),
    description: 'Infaq jamaah',
    type: 'MASUK' as const,
    amount: 50_000,
    category: { id: 'cat-infak', name: 'Infak' },
  },
  {
    id: 't4',
    date: new Date(2026, 9, 4),
    createdAt: new Date(2026, 9, 4),
    description: 'Operasional karpet',
    type: 'KELUAR' as const,
    amount: 20_000,
    category: { id: 'cat-sosial', name: 'Sosial' },
  },
  {
    id: 't5',
    date: new Date(2026, 9, 5),
    createdAt: new Date(2026, 9, 5),
    description: 'Sedekah jumat',
    type: 'MASUK' as const,
    amount: 40_000,
    category: { id: 'cat-infak', name: 'Infak' },
  },
]

/** saldoAwal carry-forward 500rb − 100rb = 400rb; running akhir 540rb. */
const EXPECTED_CARDS = {
  saldoAwal: 'Rp 400.000',
  totalMasuk: 'Rp 190.000',
  totalKeluar: 'Rp 50.000',
  saldoAkhir: 'Rp 540.000',
}

beforeEach(() => {
  vi.clearAllMocks()
  h.replace.mockReset()
  h.pathname = '/admin/kas/laporan/jurnal'
  h.url = ''
  h.db.period.findUnique.mockResolvedValue(PERIOD)
  h.db.period.findMany.mockImplementation(
    (args?: { where?: { startDate?: { lt?: Date } } }) => {
      if (args?.where?.startDate?.lt) return Promise.resolve([{ id: 'p-2025' }])
      return Promise.resolve([PERIOD])
    },
  )
  h.db.category.findMany.mockResolvedValue(CATEGORIES)
  h.db.transaction.groupBy.mockResolvedValue([
    { type: 'MASUK', _sum: { amount: 500_000 } },
    { type: 'KELUAR', _sum: { amount: 100_000 } },
  ])
  h.db.transaction.findMany.mockResolvedValue(TRANSACTIONS)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function renderPage(sp: Record<string, string> = {}) {
  const element = await JurnalKasPage({ searchParams: Promise.resolve(sp) })
  return render(element as React.ReactElement)
}

/** Kartu diambil dari paragraf kedua dalam tiap kartu (label lalu nilai). */
function cardValue(label: string): string {
  const labelEl = screen.getByText(label, { exact: true })
  const card = labelEl.closest('div')
  const valueEl = card?.querySelectorAll('p')[1]
  return valueEl?.textContent ?? ''
}

function readCards() {
  return {
    saldoAwal: cardValue('Saldo Awal (periode sebelumnya)'),
    totalMasuk: cardValue('Total Masuk'),
    totalKeluar: cardValue('Total Keluar'),
    saldoAkhir: cardValue('Saldo Akhir'),
  }
}

describe('halaman jurnal kas — kartu invarian', () => {
  it('KARTU INVARIAN: mengetik di search TIDAK mengubah keempat kartu', async () => {
    vi.useFakeTimers()
    const first = await renderPage()
    const before = readCards()
    expect(before).toEqual(EXPECTED_CARDS)

    // Jalankan search input sungguhan → debounce 400ms → router.replace.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'santunan' } })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(h.replace).toHaveBeenCalledWith('/admin/kas/laporan/jurnal?q=santunan&page=1')
    first.unmount()

    // Simulasikan round-trip server: render ulang dengan q dari URL hasil search.
    const second = await renderPage({ q: 'santunan' })
    const after = readCards()
    expect(after).toEqual(before)
    expect(after).toEqual(EXPECTED_CARDS)

    // Subset terfilter eksplisit: baris menyusut, kartu tidak.
    expect(second.container.textContent).toContain('Menampilkan 1 dari 5 entri')
    expect(second.container.textContent).toContain('Subtotal terfilter')
    expect(second.container.textContent).toContain('Keluar Rp 30.000')

    // Kalimat lengkap spec §7 dipas pada elemen hint-nya sendiri, bukan kontainer.
    const hint = screen.getByText(/Saldo dihitung dari seluruh buku besar/)
    expect(hint).toHaveTextContent(
      'Menampilkan 1 dari 5 entri — Saldo dihitung dari seluruh buku besar.',
    )
    expect(screen.getByText('Santunan anak yatim')).toBeInTheDocument()
    expect(screen.queryByText('Infak awal')).not.toBeInTheDocument()

    // No & saldo baris = nilai buildJurnal asli (entri ke-2, saldo 500rb−30rb).
    const row = screen.getByText('Santunan anak yatim').closest('tr')
    const cells = Array.from(row?.querySelectorAll('td') ?? []).map(
      (td) => td.textContent ?? '',
    )
    expect(cells[0]).toBe('2')
    expect(cells[7]).toBe('Rp 470.000')
  })

  it('filter jenis dari searchParams: kartu tetap level periode, subtotal terfilter terlihat', async () => {
    const { container } = await renderPage({ jenis: 'KELUAR' })
    expect(readCards()).toEqual(EXPECTED_CARDS)
    expect(container.textContent).toContain('Menampilkan 2 dari 5 entri')
    // Kalimat lengkap spec §7 dipas pada elemen hint-nya sendiri, bukan kontainer.
    const hint = screen.getByText(/Saldo dihitung dari seluruh buku besar/)
    expect(hint).toHaveTextContent(
      'Menampilkan 2 dari 5 entri — Saldo dihitung dari seluruh buku besar.',
    )
    expect(container.textContent).toContain('Masuk Rp 0')
    expect(container.textContent).toContain('Keluar Rp 50.000')
    expect(screen.getByText('Santunan anak yatim')).toBeInTheDocument()
    expect(screen.queryByText('Infak awal')).not.toBeInTheDocument()
  })

  it('guard roll-over: dari > sampai tidak error — baris kosong, kartu tetap penuh', async () => {
    const { container } = await renderPage({ dari: '2026-10-05', sampai: '2026-10-01' })
    expect(readCards()).toEqual(EXPECTED_CARDS)
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument()
    expect(container.textContent).toContain('Menampilkan 0 dari 5 entri')
  })

  it('sort tanggal desc: urutan dibalik, saldo per-baris TIDAK dihitung ulang, kartu tetap', async () => {
    const { container } = await renderPage({ sort: 'tanggal', dir: 'desc' })
    expect(readCards()).toEqual(EXPECTED_CARDS)

    const rows = screen.getAllByRole('row').slice(1) // buang header
    const noOrder = rows.map((row) => row.querySelectorAll('td')[0]?.textContent)
    const saldoOrder = rows.map((row) => row.querySelectorAll('td')[7]?.textContent)
    expect(noOrder).toEqual(['5', '4', '3', '2', '1'])
    // Saldo berjalan kronologis tetap menempel: 540, 500, 520, 470, 500 (rb).
    expect(saldoOrder).toEqual([
      'Rp 540.000',
      'Rp 500.000',
      'Rp 520.000',
      'Rp 470.000',
      'Rp 500.000',
    ])
    expect(container.textContent).not.toContain('Subtotal terfilter')
  })

  it('periode tak dikenal → notFound', async () => {
    await expect(renderPage({ period: 'missing' })).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('tanpa periode sama sekali → pesan peringatan, bukan crash', async () => {
    h.db.period.findMany.mockImplementation(() => Promise.resolve([]))
    h.db.transaction.findMany.mockResolvedValue([])
    h.db.transaction.groupBy.mockResolvedValue([])
    const { container } = await renderPage()
    expect(container.textContent).toContain('Belum ada periode kas')
  })
})

describe('LaporanTabs', () => {
  it('merender dua tab dengan aria-current pada tab aktif (jurnal)', () => {
    h.pathname = '/admin/kas/laporan/jurnal'
    render(<LaporanTabs />)
    const rekap = screen.getByRole('link', { name: 'Rekap Kategori' })
    const jurnal = screen.getByRole('link', { name: 'Jurnal' })
    expect(rekap).toHaveAttribute('href', '/admin/kas/laporan')
    expect(jurnal).toHaveAttribute('href', '/admin/kas/laporan/jurnal')
    expect(rekap).not.toHaveAttribute('aria-current')
    expect(jurnal).toHaveAttribute('aria-current', 'page')
  })

  it('di /admin/kas/laporan persis: tab Rekap yang aktif', () => {
    h.pathname = '/admin/kas/laporan'
    render(<LaporanTabs />)
    expect(screen.getByRole('link', { name: 'Rekap Kategori' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Jurnal' })).not.toHaveAttribute('aria-current')
  })
})
