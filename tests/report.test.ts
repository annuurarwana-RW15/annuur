import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  periodFindUniqueMock: vi.fn(),
  txGroupByMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  settingFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: h.userFindUniqueMock },
    period: { findUnique: h.periodFindUniqueMock },
    transaction: { groupBy: h.txGroupByMock },
    category: {
      findMany: h.categoryFindManyMock,
      findUnique: h.categoryFindUniqueMock,
    },
    setting: { findUnique: h.settingFindUniqueMock },
  },
}))

import { exportKasReport } from '@/app/admin/(dashboard)/kas/laporan/actions'
import { formatDateID } from '@/lib/format'
import { buildKasReport, reportToCsv, reportToExcelHtml, type KasReport } from '@/lib/report'

function loginAs(role: Role): void {
  h.authMock.mockResolvedValue({
    user: { id: 'u-1', name: 'Pengguna', role },
    expires: '2099-01-01T00:00:00.000Z',
  })
  h.userFindUniqueMock.mockResolvedValue({
    id: 'u-1',
    name: 'Pengguna',
    role,
    isActive: true,
  })
}

/** Prisma Decimal tiruan — valueOf mengembalikan string numerik. */
function decimal(value: string): { valueOf: () => string } {
  return { valueOf: () => value }
}

const PERIOD = {
  id: 'p-2026',
  name: '2026',
  status: 'AKTIF' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  closedAt: null,
  closedBy: null,
}

/**
 * agregat groupBy(by:['type','categoryId']) periode 2026:
 * Infak = 3 transaksi masuk (100k+50k+25k = 175000),
 * Operasional = 2 transaksi keluar (30k+20k = 50000).
 */
const GROUPED = [
  { type: 'MASUK', categoryId: 'c-infaq', _sum: { amount: decimal('175000') } },
  { type: 'KELUAR', categoryId: 'c-op', _sum: { amount: decimal('50000') } },
]

const CATEGORIES = [
  { id: 'c-infaq', name: 'Infak', isActive: true },
  { id: 'c-op', name: 'Operasional', isActive: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  h.periodFindUniqueMock.mockResolvedValue(PERIOD)
  h.txGroupByMock.mockResolvedValue(GROUPED)
  h.categoryFindManyMock.mockResolvedValue(CATEGORIES)
  h.categoryFindUniqueMock.mockResolvedValue({ id: 'c-infaq', name: 'Infak' })
})

describe('buildKasReport', () => {
  it('agregasi per kategori: Infak 3 masuk & Operasional 2 keluar -> 2 baris + total benar', async () => {
    const report = await buildKasReport({ periodId: 'p-2026' })

    expect(report.title).toBe('LAPORAN KEUANGAN MASJID')
    expect(report.periodLabel).toBe(
      `Periode 2026 (${formatDateID(PERIOD.startDate)} – ${formatDateID(PERIOD.endDate)})`,
    )
    expect(report.rows).toEqual([
      { kategori: 'Infak', masuk: 175000, keluar: 0, saldo: 175000 },
      { kategori: 'Operasional', masuk: 0, keluar: 50000, saldo: -50000 },
    ])
    expect(report.total).toEqual({ masuk: 175000, keluar: 50000, saldo: 125000 })
    // Decimal -> number, bukan string/objek
    for (const row of report.rows) {
      expect(typeof row.masuk).toBe('number')
      expect(typeof row.keluar).toBe('number')
      expect(typeof row.saldo).toBe('number')
    }

    expect(h.txGroupByMock).toHaveBeenCalledWith({
      by: ['type', 'categoryId'],
      where: { periodId: 'p-2026' },
      _sum: { amount: true },
    })
    expect(h.categoryFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: ['c-infaq', 'c-op'] } },
      select: { id: true, name: true },
    })
  })

  it('kategori dengan masuk & keluar -> satu baris, saldo per kategori = masuk - keluar', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', categoryId: 'c-infaq', _sum: { amount: decimal('100000') } },
      { type: 'KELUAR', categoryId: 'c-infaq', _sum: { amount: decimal('40000') } },
    ])
    h.categoryFindManyMock.mockResolvedValue([{ id: 'c-infaq', name: 'Infak', isActive: true }])

    const report = await buildKasReport({ periodId: 'p-2026' })

    expect(report.rows).toEqual([
      { kategori: 'Infak', masuk: 100000, keluar: 40000, saldo: 60000 },
    ])
    expect(report.total).toEqual({ masuk: 100000, keluar: 40000, saldo: 60000 })
  })

  it('kategori nonaktif yang punya transaksi tetap muncul di laporan', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', categoryId: 'c-lama', _sum: { amount: decimal('25000') } },
    ])
    h.categoryFindManyMock.mockResolvedValue([
      { id: 'c-lama', name: 'Dana Lama', isActive: false },
    ])

    const report = await buildKasReport({ periodId: 'p-2026' })

    expect(report.rows).toEqual([
      { kategori: 'Dana Lama', masuk: 25000, keluar: 0, saldo: 25000 },
    ])
    expect(report.total).toEqual({ masuk: 25000, keluar: 0, saldo: 25000 })
  })

  it('categoryId filter -> where menyempit & hanya baris kategori itu', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', categoryId: 'c-infaq', _sum: { amount: decimal('175000') } },
    ])
    h.categoryFindManyMock.mockResolvedValue([{ id: 'c-infaq', name: 'Infak', isActive: true }])

    const report = await buildKasReport({ periodId: 'p-2026', categoryId: 'c-infaq' })

    expect(h.txGroupByMock).toHaveBeenCalledWith({
      by: ['type', 'categoryId'],
      where: { periodId: 'p-2026', categoryId: 'c-infaq' },
      _sum: { amount: true },
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0].kategori).toBe('Infak')
    expect(report.total).toEqual({ masuk: 175000, keluar: 0, saldo: 175000 })
  })

  it('periode tidak ditemukan -> throw tanpa query transaksi/kategori', async () => {
    h.periodFindUniqueMock.mockResolvedValue(null)

    await expect(buildKasReport({ periodId: 'p-hilang' })).rejects.toThrow(
      'Periode tidak ditemukan',
    )
    expect(h.txGroupByMock).not.toHaveBeenCalled()
    expect(h.categoryFindManyMock).not.toHaveBeenCalled()
  })

  it('periode tanpa transaksi -> rows kosong, total nol, tanpa query kategori', async () => {
    h.txGroupByMock.mockResolvedValue([])

    const report = await buildKasReport({ periodId: 'p-2026' })

    expect(report.rows).toEqual([])
    expect(report.total).toEqual({ masuk: 0, keluar: 0, saldo: 0 })
    expect(h.categoryFindManyMock).not.toHaveBeenCalled()
  })
})

describe('reportToCsv', () => {
  it('BOM UTF-8, header `Kategori;Masuk;Keluar;Saldo`, angka polos, TOTAL baris terakhir', async () => {
    const report = await buildKasReport({ periodId: 'p-2026' })

    const csv = reportToCsv(report)

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).trimEnd().split('\n')
    expect(lines[0]).toBe('Kategori;Masuk;Keluar;Saldo')
    expect(lines[1]).toBe('Infak;175000;0;175000')
    expect(lines[2]).toBe('Operasional;0;50000;-50000')
    expect(lines[lines.length - 1]).toBe('TOTAL;175000;50000;125000')
    // sel numerik polos, bukan format tampilan
    expect(csv).not.toContain('Rp')
    expect(csv).not.toContain('.')
  })

  it('guard formula warisan buildCsv: nama kategori `=EVIL` diprefiks apostrof', () => {
    const report: KasReport = {
      title: 'LAPORAN KEUANGAN MASJID',
      periodLabel: 'Periode 2026',
      rows: [{ kategori: '=EVIL()', masuk: 1000, keluar: 0, saldo: 1000 }],
      total: { masuk: 1000, keluar: 0, saldo: 1000 },
    }

    const csv = reportToCsv(report)

    expect(csv).toContain(`'=EVIL()`)
    expect(csv).not.toMatch(/(^|\n)=EVIL/)
  })
})

describe('reportToExcelHtml', () => {
  it('kop laporan + header tabel + baris TOTAL dengan angka polos', async () => {
    const report = await buildKasReport({ periodId: 'p-2026' })

    const html = reportToExcelHtml(report)

    expect(html).toContain('<table')
    expect(html).toContain('LAPORAN KEUANGAN MASJID')
    expect(html).toContain(report.periodLabel)
    expect(html).toContain('<th>Masuk</th>')
    expect(html).toContain('Infak')
    expect(html).toContain('175000')
    expect(html).toContain('TOTAL')
    expect(html).not.toContain('Rp ')
  })

  it('guard formula sel kategori: `=EVIL` diprefiks apostrof (mirip escapeCell)', () => {
    const html = reportToExcelHtml({
      title: 'LAPORAN KEUANGAN MASJID',
      periodLabel: 'Periode 2026',
      rows: [{ kategori: '=EVIL()', masuk: 1000, keluar: 0, saldo: 1000 }],
      total: { masuk: 1000, keluar: 0, saldo: 1000 },
    })

    expect(html).toContain(`'=EVIL()`)
    expect(html).not.toContain('<td>=EVIL')
  })
})

describe('exportKasReport', () => {
  it('VIEWER -> reject "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(exportKasReport('csv', { periodId: 'p-2026' })).rejects.toThrow(
      'Akses ditolak',
    )

    expect(h.periodFindUniqueMock).not.toHaveBeenCalled()
    expect(h.txGroupByMock).not.toHaveBeenCalled()
    expect(h.categoryFindManyMock).not.toHaveBeenCalled()
    expect(h.categoryFindUniqueMock).not.toHaveBeenCalled()
  })

  it('BENDAHARA -> {ok:true} CSV: filename laporan-kas-2026.csv, mime csv, content BOM+TOTAL', async () => {
    loginAs('BENDAHARA')

    const result = await exportKasReport('csv', { periodId: 'p-2026' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('laporan-kas-2026.csv')
    expect(result.mime).toBe('text/csv;charset=utf-8')
    expect(result.content.charCodeAt(0)).toBe(0xfeff)
    expect(result.content).toContain('Kategori;Masuk;Keluar;Saldo')
    expect(result.content.trimEnd().endsWith('TOTAL;175000;50000;125000')).toBe(true)
  })

  it('ADMIN -> excel: filename .xls, mime vnd.ms-excel, content kop+laporan', async () => {
    const result = await exportKasReport('excel', { periodId: 'p-2026' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('laporan-kas-2026.xls')
    expect(result.mime).toBe('application/vnd.ms-excel')
    expect(result.content).toContain('<table')
    expect(result.content).toContain('LAPORAN KEUANGAN MASJID')
    expect(result.content).toContain('TOTAL')
  })

  it('categoryId diteruskan ke buildKasReport', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', categoryId: 'c-infaq', _sum: { amount: decimal('175000') } },
    ])
    h.categoryFindManyMock.mockResolvedValue([{ id: 'c-infaq', name: 'Infak', isActive: true }])

    const result = await exportKasReport('csv', { periodId: 'p-2026', categoryId: 'c-infaq' })

    expect(result.ok).toBe(true)
    expect(h.txGroupByMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { periodId: 'p-2026', categoryId: 'c-infaq' } }),
    )
  })

  it('categoryId asing -> {ok:false, Kategori tidak ditemukan} tanpa query agregat', async () => {
    h.categoryFindUniqueMock.mockResolvedValue(null)

    const result = await exportKasReport('csv', { periodId: 'p-2026', categoryId: 'c-hilang' })

    expect(result).toEqual({ ok: false, error: 'Kategori tidak ditemukan' })
    expect(h.txGroupByMock).not.toHaveBeenCalled()
  })

  it('periode tidak ditemukan -> {ok:false, error:Periode tidak ditemukan}', async () => {
    h.periodFindUniqueMock.mockResolvedValue(null)

    const result = await exportKasReport('csv', { periodId: 'p-hilang' })

    expect(result).toEqual({ ok: false, error: 'Periode tidak ditemukan' })
    expect(h.txGroupByMock).not.toHaveBeenCalled()
  })
})
