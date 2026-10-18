import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  applyTableControls,
  applyTransactionControls,
  categorySummary,
  publicKeterangan,
  resolvePublicCatIds,
  type PublicLaporanRow,
  type PublicTransactionRow,
} from '@/app/(public)/laporan-kas/rows'

const h = vi.hoisted(() => ({
  getActivePeriodMock: vi.fn(),
  getSettingMock: vi.fn(),
  /** Props terakhir yang diterima PublicLaporanTable (untuk assert tanpa render DOM). */
  table: null as Record<string, unknown> | null,
  db: {
    period: { findFirst: vi.fn() },
    category: { findMany: vi.fn() },
    transaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/kas', () => ({
  getActivePeriod: h.getActivePeriodMock,
}))

vi.mock('@/lib/settings', () => ({
  getSetting: h.getSettingMock,
}))

vi.mock('@/lib/db', () => ({
  db: {
    period: { findFirst: h.db.period.findFirst },
    category: { findMany: h.db.category.findMany },
    transaction: {
      findMany: h.db.transaction.findMany,
      groupBy: h.db.transaction.groupBy,
      count: h.db.transaction.count,
    },
  },
}))

// Komponen client di-render sebagai null: KasTrendChart pakai recharts
// (butuh ResizeObserver yang tidak ada di jsdom/node) dan LaporanKasTabs
// memakai usePathname yang butuh App Router context. Yang diuji di sini
// adalah LOGIKA halaman server-nya, bukan komponennya.
vi.mock('@/app/(public)/laporan-kas/LaporanKasTabs', () => ({
  LaporanKasTabs: () => null,
}))
vi.mock('@/app/(public)/laporan-kas/KasTrendChart', () => ({
  KasTrendChart: () => null,
}))
vi.mock('@/app/(public)/laporan-kas/PublicLaporanTable', () => ({
  PublicLaporanTable: (props: Record<string, unknown>) => {
    h.table = props
    return null
  },
}))

describe('Laporan Kas Publik', () => {
  const ACTIVE_PERIOD = {
    id: 'p-2026',
    name: '2026',
    status: 'AKTIF' as const,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  }

  const CATEGORIES = [
    { id: 'c-infak', name: 'Infak', type: 'MASUK' as const, isActive: true },
    { id: 'c-sedekah', name: 'Sedekah', type: 'MASUK' as const, isActive: true },
    { id: 'c-zakat', name: 'Zakat', type: 'MASUK' as const, isActive: true },
    { id: 'c-sosial', name: 'Sosial', type: 'KELUAR' as const, isActive: true },
  ]

  const TRANSACTIONS = [
    {
      id: 'tx-1',
      type: 'MASUK' as const,
      amount: 100000,
      date: new Date('2026-10-01'),
      createdAt: new Date('2026-10-01'),
      description: 'Infak jamaah',
      donationId: null,
      receiptImage: null,
      category: { id: 'c-infak', name: 'Infak' },
    },
    {
      id: 'tx-2',
      type: 'MASUK' as const,
      amount: 50000,
      date: new Date('2026-10-02'),
      createdAt: new Date('2026-10-02'),
      description: 'Infak pengajian',
      donationId: 'don-1',
      receiptImage: null,
      category: { id: 'c-infak', name: 'Infak' },
    },
    {
      id: 'tx-3',
      type: 'KELUAR' as const,
      amount: 25000,
      date: new Date('2026-10-03'),
      createdAt: new Date('2026-10-03'),
      description: 'Santunan anak yatim',
      donationId: null,
      receiptImage: null,
      category: { id: 'c-sosial', name: 'Sosial' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    h.table = null
  })

  async function renderPage(params: Record<string, string> = {}) {
    const { default: page } = await import('@/app/(public)/laporan-kas/page')
    const element = await page({ searchParams: Promise.resolve(params) })
    return renderToStaticMarkup(element)
  }

  it('tanpa periode aktif → menampilkan pesan "Belum ada periode aktif"', async () => {
    h.getActivePeriodMock.mockResolvedValue(null)

    const html = await renderPage()

    expect(html).toContain('Belum ada periode aktif')
    expect(h.db.transaction.findMany).not.toHaveBeenCalled()
    expect(h.table).toBeNull()
  })

  it('periode aktif → ringkasan per kategori cocok dengan total transaksi', async () => {
    h.getActivePeriodMock.mockResolvedValue(ACTIVE_PERIOD)
    h.getSettingMock.mockResolvedValue(undefined) // fallback: semua kategori MASUK
    h.db.category.findMany.mockResolvedValue(CATEGORIES)
    h.db.transaction.findMany.mockResolvedValue(TRANSACTIONS)

    await renderPage()

    expect(h.db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          periodId: 'p-2026',
          AND: { categoryId: { in: ['c-infak', 'c-sedekah', 'c-zakat'] } },
        }),
      }),
    )

    const rows = h.table!.rows as PublicLaporanRow[]
    expect(rows.map((r) => r.categoryId)).toEqual(['c-infak', 'c-sedekah', 'c-zakat'])

    const infak = rows[0]
    expect(infak.masuk).toBe(150000)
    expect(infak.keluar).toBe(0)
    expect(infak.saldo).toBe(150000)
    expect(infak.terbarik).toBe(new Date('2026-10-02').toISOString())

    // Kategori MASUK tanpa transaksi tetap tampil dengan nol.
    expect(rows[1]).toMatchObject({ masuk: 0, keluar: 0, saldo: 0, terbarik: null })
    // Kategori KELUAR (Sosial) TIDAK boleh muncul di laporan publik.
    expect(rows.map((r) => r.categoryId)).not.toContain('c-sosial')
    expect(h.table!.total).toBe(3)
  })

  it('periode aktif → menampilkan disclaimer transparansi dan link donasi', async () => {
    h.getActivePeriodMock.mockResolvedValue(ACTIVE_PERIOD)
    h.getSettingMock.mockResolvedValue(undefined)
    h.db.category.findMany.mockResolvedValue(CATEGORIES)
    h.db.transaction.findMany.mockResolvedValue([])

    const html = await renderPage()

    expect(html).toContain('Laporan ini dibuat berdasarkan data transaksi')
    expect(html).toContain('href="/donasi"')
    expect(html).toContain('Laporan Kas Publik')
  })

  it('filter kategori → hanya kategori itu yang diringkas', async () => {
    h.getActivePeriodMock.mockResolvedValue(ACTIVE_PERIOD)
    h.getSettingMock.mockResolvedValue(undefined)
    h.db.category.findMany.mockResolvedValue(CATEGORIES)
    h.db.transaction.findMany.mockResolvedValue(TRANSACTIONS)

    await renderPage({ kategori: 'c-zakat' })

    const rows = h.table!.rows as PublicLaporanRow[]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ categoryId: 'c-zakat', masuk: 0, keluar: 0 })
    expect(h.db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: { categoryId: { in: ['c-zakat'] } },
        }),
      }),
    )
  })

  it('kategori publik lewat nama lama tetap diterima', async () => {
    expect(
      resolvePublicCatIds(['Infak', 'c-zakat'], CATEGORIES),
    ).toEqual(['c-infak', 'c-zakat'])
  })

  it('setting kosong → semua kategori MASUK; setting tak cocok → kosong', () => {
    expect(resolvePublicCatIds(undefined, CATEGORIES)).toEqual([
      'c-infak',
      'c-sedekah',
      'c-zakat',
    ])
    expect(resolvePublicCatIds([], CATEGORIES)).toEqual([
      'c-infak',
      'c-sedekah',
      'c-zakat',
    ])
    expect(resolvePublicCatIds(['tidak-ada'], CATEGORIES)).toEqual([])
  })
})

describe('categorySummary', () => {
  const names = new Map([
    ['c-infak', 'Infak'],
    ['c-sosial', 'Sosial'],
  ])

  it('menjumlahkan masuk/keluar dan menghitung saldo per kategori', () => {
    const result = categorySummary(
      ['c-infak', 'c-sosial'],
      [
        {
          type: 'MASUK',
          amount: 100000,
          createdAt: new Date('2026-10-01'),
          category: { id: 'c-infak', name: 'Infak' },
        },
        {
          type: 'MASUK',
          amount: 50000,
          createdAt: new Date('2026-10-02'),
          category: { id: 'c-infak', name: 'Infak' },
        },
        {
          type: 'KELUAR',
          amount: 25000,
          createdAt: new Date('2026-10-03'),
          category: { id: 'c-sosial', name: 'Sosial' },
        },
      ],
      names,
    )

    expect(result).toEqual([
      {
        categoryId: 'c-infak',
        categoryName: 'Infak',
        masuk: 150000,
        keluar: 0,
        saldo: 150000,
        terbarik: new Date('2026-10-02'),
      },
      {
        categoryId: 'c-sosial',
        categoryName: 'Sosial',
        masuk: 0,
        keluar: 25000,
        saldo: -25000,
        terbarik: new Date('2026-10-03'),
      },
    ])
  })

  it('kategori terpilih tanpa transaksi → nol + nama tetap ada', () => {
    const result = categorySummary(['c-infak'], [], names)
    expect(result[0]).toEqual({
      categoryId: 'c-infak',
      categoryName: 'Infak',
      masuk: 0,
      keluar: 0,
      saldo: 0,
      terbarik: null,
    })
  })

  it('transaksi di kategori di luar daftar terpilih diabaikan', () => {
    const result = categorySummary(
      ['c-infak'],
      [
        {
          type: 'KELUAR',
          amount: 999,
          createdAt: new Date('2026-10-03'),
          category: { id: 'c-sosial', name: 'Sosial' },
        },
      ],
      names,
    )
    expect(result[0]).toMatchObject({ masuk: 0, keluar: 0, saldo: 0, terbarik: null })
  })

  it('kategori tanpa nama di map → "—"', () => {
    const result = categorySummary(['c-unknown'], [], names)
    expect(result[0].categoryName).toBe('—')
  })
})

const ROWS: PublicLaporanRow[] = [
  {
    categoryId: 'c-infak',
    categoryName: 'Infak',
    masuk: 150000,
    keluar: 0,
    saldo: 150000,
    terbarik: '2026-10-02T00:00:00.000Z',
  },
  {
    categoryId: 'c-sedekah',
    categoryName: 'Sedekah',
    masuk: 50000,
    keluar: 10000,
    saldo: 40000,
    terbarik: null,
  },
  {
    categoryId: 'c-zakat',
    categoryName: 'Zakat',
    masuk: 0,
    keluar: 25000,
    saldo: -25000,
    terbarik: '2026-10-01T00:00:00.000Z',
  },
]

describe('applyTableControls (search/sort/pagination /laporan-kas)', () => {
  const base = { q: '', page: 1, size: 20 }

  it('tanpa kontrol → semua baris, total = panjang', () => {
    const result = applyTableControls(ROWS, base)
    expect(result.rows).toHaveLength(3)
    expect(result.total).toBe(3)
  })

  it('search q memfilter kategori case-insensitive + total terfilter', () => {
    const result = applyTableControls(ROWS, { ...base, q: 'ZAK' })
    expect(result.rows.map((r) => r.categoryId)).toEqual(['c-zakat'])
    expect(result.total).toBe(1)
  })

  it('search tanpa hasil → rows kosong, total 0', () => {
    const result = applyTableControls(ROWS, { ...base, q: 'tidak ada' })
    expect(result.rows).toEqual([])
    expect(result.total).toBe(0)
  })

  it('sort kolom angka desc/asc', () => {
    const desc = applyTableControls(ROWS, {
      ...base,
      sort: 'saldo',
      dir: 'desc',
    })
    expect(desc.rows.map((r) => r.categoryId)).toEqual([
      'c-infak',
      'c-sedekah',
      'c-zakat',
    ])

    const asc = applyTableControls(ROWS, {
      ...base,
      sort: 'masuk',
      dir: 'asc',
    })
    expect(asc.rows.map((r) => r.categoryId)).toEqual([
      'c-zakat',
      'c-sedekah',
      'c-infak',
    ])
  })

  it('sort nama kategori asc + null terbarik di akhir', () => {
    const byName = applyTableControls(ROWS, {
      ...base,
      sort: 'categoryName',
      dir: 'asc',
    })
    expect(byName.rows.map((r) => r.categoryName)).toEqual([
      'Infak',
      'Sedekah',
      'Zakat',
    ])

    const byDate = applyTableControls(ROWS, {
      ...base,
      sort: 'terbarik',
      dir: 'desc',
    })
    expect(byDate.rows.map((r) => r.categoryId)).toEqual([
      'c-infak',
      'c-zakat',
      'c-sedekah',
    ])
  })

  it('sort key tak dikenal diabaikan (urutan asli dipertahankan)', () => {
    const result = applyTableControls(ROWS, {
      ...base,
      sort: 'aksi',
      dir: 'desc',
    })
    expect(result.rows.map((r) => r.categoryId)).toEqual([
      'c-infak',
      'c-sedekah',
      'c-zakat',
    ])
  })

  it('pagination: size 20 → semua muat; page di luar rentang → rows kosong', () => {
    expect(applyTableControls(ROWS, { ...base, size: 20 }).rows).toHaveLength(3)
    expect(applyTableControls(ROWS, { ...base, page: 2, size: 20 })).toEqual({
      rows: [],
      total: 3,
    })
  })
})

describe('publicKeterangan', () => {
  it('donasi terverifikasi → label generik, nama donatur TIDAK bocor', () => {
    expect(publicKeterangan('Donasi Ahmad (REF-1)', 'don-1')).toBe(
      'Donasi terverifikasi',
    )
  })

  it('kas manual (donationId null) → description ditampilkan apa adanya', () => {
    expect(publicKeterangan('Beli karpet', null)).toBe('Beli karpet')
  })

  it('kas manual kosong/whitespace → null', () => {
    expect(publicKeterangan('   ', null)).toBeNull()
    expect(publicKeterangan('', null)).toBeNull()
  })
})

describe('applyTransactionControls', () => {
  const TX_ROWS: PublicTransactionRow[] = [
    {
      id: 't1',
      tanggal: '2026-10-03',
      jenis: 'KELUAR',
      kategoriName: 'Sosial',
      nominal: 25000,
      keterangan: 'Santunan anak yatim',
      receiptImage: null,
    },
    {
      id: 't2',
      tanggal: '2026-10-02',
      jenis: 'MASUK',
      kategoriName: 'Infak',
      nominal: 150000,
      keterangan: 'Donasi terverifikasi',
      receiptImage: 'https://cdn.example/kwitansi.jpg',
    },
    {
      id: 't3',
      tanggal: '2026-10-01',
      jenis: 'MASUK',
      kategoriName: 'Zakat',
      nominal: 50000,
      keterangan: null,
      receiptImage: null,
    },
  ]
  const base = { q: '', page: 1, size: 20 }

  it('tanpa kontrol → semua baris dipertahankan', () => {
    const result = applyTransactionControls(TX_ROWS, base)
    expect(result.rows).toHaveLength(3)
    expect(result.total).toBe(3)
  })

  it('search mencocokkan kategori & keterangan (case-insensitive)', () => {
    expect(
      applyTransactionControls(TX_ROWS, { ...base, q: 'yatim' }).rows.map(
        (r) => r.id,
      ),
    ).toEqual(['t1'])
    expect(
      applyTransactionControls(TX_ROWS, { ...base, q: 'INFak' }).rows.map(
        (r) => r.id,
      ),
    ).toEqual(['t2'])
  })

  it('sort nominal desc: 150rb > 50rb > 25rb', () => {
    const result = applyTransactionControls(TX_ROWS, {
      ...base,
      sort: 'nominal',
      dir: 'desc',
    })
    expect(result.rows.map((r) => r.id)).toEqual(['t2', 't3', 't1'])
  })

  it('sort tanggal desc (ISO leksikografis)', () => {
    const result = applyTransactionControls(TX_ROWS, {
      ...base,
      sort: 'tanggal',
      dir: 'desc',
    })
    expect(result.rows.map((r) => r.id)).toEqual(['t1', 't2', 't3'])
  })

  it('sort keterangan: null selalu di akhir', () => {
    const result = applyTransactionControls(TX_ROWS, {
      ...base,
      sort: 'keterangan',
      dir: 'asc',
    })
    expect(result.rows.map((r) => r.id)).toEqual(['t2', 't1', 't3'])
  })

  it('pagination: size 2 → 2 baris; page 2 → sisa', () => {
    expect(applyTransactionControls(TX_ROWS, { ...base, size: 2 }).rows).toHaveLength(2)
    expect(applyTransactionControls(TX_ROWS, { ...base, page: 2, size: 2 })).toEqual({
      rows: [expect.objectContaining({ id: 't3' })],
      total: 3,
    })
  })
})
