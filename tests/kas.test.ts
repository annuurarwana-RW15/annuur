import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  periodFindFirstMock: vi.fn(),
  txGroupByMock: vi.fn(),
  txCountMock: vi.fn(),
  txFindManyMock: vi.fn(),
  txFindUniqueMock: vi.fn(),
  txCreateMock: vi.fn(),
  txUpdateMock: vi.fn(),
  txDeleteMock: vi.fn(),
  revalidatePathMock: vi.fn(),
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
    period: { findFirst: h.periodFindFirstMock },
    transaction: {
      groupBy: h.txGroupByMock,
      count: h.txCountMock,
      findMany: h.txFindManyMock,
      findUnique: h.txFindUniqueMock,
      create: h.txCreateMock,
      update: h.txUpdateMock,
      delete: h.txDeleteMock,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/app/admin/(dashboard)/kas/transaksi/actions'
import {
  getDayFlow,
  getPeriodBalance,
  listRecentTransactions,
  listTransactions,
} from '@/lib/kas'

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

const ACTIVE_PERIOD = {
  id: 'p-2026',
  name: '2026',
  status: 'AKTIF' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
}

const VALID_INPUT = {
  type: 'MASUK' as const,
  amount: 150000,
  date: '2026-10-01',
  description: 'Infak jamaah Jumat',
  categoryId: 'c-infaq',
}

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  h.periodFindFirstMock.mockResolvedValue(null)
  h.txFindUniqueMock.mockResolvedValue(null)
})

describe('getPeriodBalance', () => {
  it('3 masuk (100k+50k+25k) + 2 keluar (30k+20k) -> {masuk:175000, keluar:50000, saldo:125000}', async () => {
    // groupBy(by:['type']) menghasilkan satu baris per jenis berisi total _sum.
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: 175000 } },
      { type: 'KELUAR', _sum: { amount: 50000 } },
    ])

    const result = await getPeriodBalance('p-2026')

    expect(result).toEqual({ masuk: 175000, keluar: 50000, saldo: 125000 })
    expect(h.txGroupByMock).toHaveBeenCalledWith({
      by: ['type'],
      where: { periodId: 'p-2026' },
      _sum: { amount: true },
    })
  })

  it('amount Prisma Decimal (objek valueOf string) dikonversi aman ke number', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: { valueOf: () => '175000.50' } } },
    ])

    const result = await getPeriodBalance('p-2026')

    expect(result.masuk).toBe(175000.5)
    expect(result.keluar).toBe(0)
    expect(result.saldo).toBe(175000.5)
  })

  it('tanpa transaksi -> semua nol', async () => {
    h.txGroupByMock.mockResolvedValue([])

    expect(await getPeriodBalance('p kosong')).toEqual({
      masuk: 0,
      keluar: 0,
      saldo: 0,
    })
  })
})

describe('createTransaction', () => {
  it('tanpa periode aktif -> {ok:false, error:Tidak ada periode aktif} tanpa create', async () => {
    h.periodFindFirstMock.mockResolvedValue(null)

    const result = await createTransaction(VALID_INPUT)

    expect(result).toEqual({ ok: false, error: 'Tidak ada periode aktif' })
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('tanpa periode aktif tetapi ada periode DITUTUP -> {ok:false, Periode sudah ditutup}', async () => {
    h.periodFindFirstMock.mockImplementation(
      async (args: { where?: { status?: string } } = {}) =>
        args.where?.status === 'DITUTUP' ? { id: 'p-closed' } : null,
    )

    const result = await createTransaction(VALID_INPUT)

    expect(result).toEqual({ ok: false, error: 'Periode sudah ditutup' })
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('periode aktif ada -> create masuk periode itu + createdBy sesi + revalidate', async () => {
    h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)
    h.txCreateMock.mockResolvedValue({ id: 'tx-1' })

    const result = await createTransaction({
      ...VALID_INPUT,
      receiptImage: 'https://cdn.example.com/kas/bukti.jpg',
    })

    expect(result).toEqual({ ok: true })
    expect(h.txCreateMock).toHaveBeenCalledWith({
      data: {
        type: 'MASUK',
        amount: 150000,
        date: new Date('2026-10-01'),
        description: 'Infak jamaah Jumat',
        categoryId: 'c-infaq',
        periodId: 'p-2026',
        createdBy: 'u-1',
        receiptImage: 'https://cdn.example.com/kas/bukti.jpg',
      },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/transaksi')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin')
  })

  it('BENDAHARA diizinkan membuat transaksi', async () => {
    loginAs('BENDAHARA')
    h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)
    h.txCreateMock.mockResolvedValue({ id: 'tx-2' })

    const result = await createTransaction(VALID_INPUT)

    expect(result).toEqual({ ok: true })
    expect(h.txCreateMock).toHaveBeenCalledTimes(1)
  })

  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database transaksi/periode', async () => {
    loginAs('VIEWER')

    await expect(createTransaction(VALID_INPUT)).rejects.toThrow('Akses ditolak')

    expect(h.periodFindFirstMock).not.toHaveBeenCalled()
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.txUpdateMock).not.toHaveBeenCalled()
    expect(h.txDeleteMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it.each([0, -5, Number.NaN])(
    'amount %s -> {ok:false} tanpa create',
    async (amount) => {
      h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)

      const result = await createTransaction({ ...VALID_INPUT, amount })

      expect(result.ok).toBe(false)
      expect(h.txCreateMock).not.toHaveBeenCalled()
    },
  )

  it('keterangan kosong / >200 karakter -> {ok:false} tanpa create', async () => {
    h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)

    const kosong = await createTransaction({ ...VALID_INPUT, description: '   ' })
    const panjang = await createTransaction({
      ...VALID_INPUT,
      description: 'x'.repeat(201),
    })

    expect(kosong.ok).toBe(false)
    expect(panjang.ok).toBe(false)
    expect(h.txCreateMock).not.toHaveBeenCalled()
  })
})

describe('updateTransaction', () => {
  it('periode transaksi DITUTUP -> {ok:false, error:Periode sudah ditutup} tanpa update', async () => {
    h.txFindUniqueMock.mockResolvedValue({
      id: 'tx-1',
      periodId: 'p-2025',
      period: { id: 'p-2025', status: 'DITUTUP' },
    })

    const result = await updateTransaction('tx-1', {
      ...VALID_INPUT,
      amount: 200000,
    })

    expect(result).toEqual({ ok: false, error: 'Periode sudah ditutup' })
    expect(h.txUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('transaksi tidak ditemukan -> {ok:false} tanpa update', async () => {
    const result = await updateTransaction('hilang', VALID_INPUT)

    expect(result.ok).toBe(false)
    expect(h.txUpdateMock).not.toHaveBeenCalled()
  })

  it('periode AKTIF -> update field + revalidate (periodeId tidak berubah)', async () => {
    h.txFindUniqueMock.mockResolvedValue({
      id: 'tx-1',
      periodId: 'p-2026',
      period: { id: 'p-2026', status: 'AKTIF' },
    })
    h.txUpdateMock.mockResolvedValue({})

    const result = await updateTransaction('tx-1', {
      type: 'KELUAR',
      amount: 75000,
      date: '2026-10-02',
      description: 'Belanja kebutuhan',
      categoryId: 'c-belanja',
    })

    expect(result).toEqual({ ok: true })
    expect(h.txUpdateMock).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: {
        type: 'KELUAR',
        amount: 75000,
        date: new Date('2026-10-02'),
        description: 'Belanja kebutuhan',
        categoryId: 'c-belanja',
        receiptImage: null,
      },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/transaksi')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin')
  })

  it('VIEWER melempar "Akses ditolak" tanpa update', async () => {
    loginAs('VIEWER')

    await expect(updateTransaction('tx-1', VALID_INPUT)).rejects.toThrow(
      'Akses ditolak',
    )
    expect(h.txFindUniqueMock).not.toHaveBeenCalled()
    expect(h.txUpdateMock).not.toHaveBeenCalled()
  })

  it('amount tidak valid -> {ok:false} tanpa menyentuh database', async () => {
    const result = await updateTransaction('tx-1', { ...VALID_INPUT, amount: 0 })

    expect(result.ok).toBe(false)
    expect(h.txFindUniqueMock).not.toHaveBeenCalled()
    expect(h.txUpdateMock).not.toHaveBeenCalled()
  })
})

describe('deleteTransaction', () => {
  it('periode transaksi DITUTUP -> {ok:false, error:Periode sudah ditutup} tanpa delete', async () => {
    h.txFindUniqueMock.mockResolvedValue({
      id: 'tx-1',
      periodId: 'p-2025',
      period: { id: 'p-2025', status: 'DITUTUP' },
    })

    const result = await deleteTransaction('tx-1')

    expect(result).toEqual({ ok: false, error: 'Periode sudah ditutup' })
    expect(h.txDeleteMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('transaksi tidak ditemukan -> {ok:false} tanpa delete', async () => {
    const result = await deleteTransaction('hilang')

    expect(result.ok).toBe(false)
    expect(h.txDeleteMock).not.toHaveBeenCalled()
  })

  it('periode AKTIF -> delete + revalidate', async () => {
    h.txFindUniqueMock.mockResolvedValue({
      id: 'tx-1',
      periodId: 'p-2026',
      period: { id: 'p-2026', status: 'AKTIF' },
    })
    h.txDeleteMock.mockResolvedValue({})

    const result = await deleteTransaction('tx-1')

    expect(result).toEqual({ ok: true })
    expect(h.txDeleteMock).toHaveBeenCalledWith({ where: { id: 'tx-1' } })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/transaksi')
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin')
  })

  it('VIEWER melempar "Akses ditolak" tanpa delete', async () => {
    loginAs('VIEWER')

    await expect(deleteTransaction('tx-1')).rejects.toThrow('Akses ditolak')
    expect(h.txFindUniqueMock).not.toHaveBeenCalled()
    expect(h.txDeleteMock).not.toHaveBeenCalled()
  })
})

describe('listTransactions', () => {
  const DB_ROW = {
    id: 'tx-1',
    type: 'MASUK' as const,
    // Prisma Decimal tiruan — valueOf mengembalikan string numerik.
    amount: { valueOf: () => '100000' },
    date: new Date('2026-03-01'),
    description: 'Infak jamaah Jumat',
    receiptImage: null,
    createdAt: new Date('2026-03-01T01:00:00Z'),
    category: { id: 'c-infaq', name: 'Infak', color: '#0f4c3a' },
  }

  const PARAMS = { q: '', page: 1, size: 20 } as const

  it('row memuat categoryName/categoryColor flat (untuk cell export CSV/Excel)', async () => {
    h.txCountMock.mockResolvedValue(2)
    h.txFindManyMock.mockResolvedValue([
      DB_ROW,
      { ...DB_ROW, id: 'tx-2', category: null },
    ])

    const { rows, total } = await listTransactions({ ...PARAMS, periodId: 'p-2026' })

    expect(total).toBe(2)
    expect(rows[0].categoryName).toBe('Infak')
    expect(rows[0].categoryColor).toBe('#0f4c3a')
    expect(rows[0].amount).toBe(100000) // Decimal -> number
    expect(rows[0].category).toEqual(DB_ROW.category) // object render tetap ada
    expect(rows[1].categoryName).toBeNull()
    expect(rows[1].categoryColor).toBeNull()
    // periodId dipass pemanggil -> tanpa lookup periode aktif ganda
    expect(h.periodFindFirstMock).not.toHaveBeenCalled()
    expect(h.txFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ periodId: 'p-2026' }) }),
    )
  })

  it('tanpa periodId -> fallback ke periode AKTIF dari database', async () => {
    h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)
    h.txCountMock.mockResolvedValue(1)
    h.txFindManyMock.mockResolvedValue([DB_ROW])

    const { rows } = await listTransactions(PARAMS)

    expect(h.periodFindFirstMock).toHaveBeenCalledTimes(1)
    expect(h.txFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ periodId: 'p-2026' }) }),
    )
    expect(rows[0].categoryName).toBe('Infak')
  })

  it('tanpa periodId & tanpa periode aktif -> daftar kosong tanpa query transaksi', async () => {
    const result = await listTransactions(PARAMS)

    expect(result).toEqual({ rows: [], total: 0 })
    expect(h.txCountMock).not.toHaveBeenCalled()
    expect(h.txFindManyMock).not.toHaveBeenCalled()
  })
})

describe('getDayFlow (kartu hint "Hari ini" di dashboard)', () => {
  it('menjumlah masuk & keluar pada hari UTC yang diberikan, dibatasi periode', async () => {
    h.txGroupByMock.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: '150000' } },
      { type: 'KELUAR', _sum: { amount: '50000' } },
    ])

    const flow = await getDayFlow('p-2026', new Date(Date.UTC(2026, 9, 18, 15, 30)))

    expect(flow).toEqual({ masuk: 150000, keluar: 50000 })
    // Batas hari harus [00:00, 00:00+1) — konsisten dengan dateOrUndefined (UTC).
    expect(h.txGroupByMock).toHaveBeenCalledWith({
      by: ['type'],
      where: {
        periodId: 'p-2026',
        date: {
          gte: new Date(Date.UTC(2026, 9, 18)),
          lt: new Date(Date.UTC(2026, 9, 19)),
        },
      },
      _sum: { amount: true },
    })
  })

  it('tanpa transaksi hari ini -> nol, bukan NaN atau undefined', async () => {
    h.txGroupByMock.mockResolvedValue([])

    await expect(getDayFlow('p-2026', new Date(Date.UTC(2026, 9, 18)))).resolves.toEqual({
      masuk: 0,
      keluar: 0,
    })
  })

  it('hanya tipe yang ada diangkat — tipe lain diabaikan', async () => {
    h.txGroupByMock.mockResolvedValue([{ type: 'MASUK', _sum: { amount: '75000' } }])

    await expect(getDayFlow('p-2026', new Date(Date.UTC(2026, 9, 18)))).resolves.toEqual({
      masuk: 75000,
      keluar: 0,
    })
  })
})

describe('listRecentTransactions (tabel terbaru di dashboard)', () => {
  const ROW = {
    id: 'tx-9',
    type: 'KELUAR' as const,
    amount: { valueOf: () => '50000' },
    date: new Date('2026-10-18'),
    description: 'Santunan anak yatim',
    receiptImage: null,
    createdAt: new Date('2026-10-18T02:00:00Z'),
    category: { id: 'c-sosial', name: 'Sosial', color: '#b91c1c' },
  }

  it('mengambil N baris terbaru: urut tanggal lalu createdAt, lalu dipetakan ke TransactionRow', async () => {
    h.txFindManyMock.mockResolvedValue([ROW])

    const rows = await listRecentTransactions('p-2026', 5)

    expect(h.txFindManyMock).toHaveBeenCalledWith({
      where: { periodId: 'p-2026' },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(50000) // Decimal -> number
    expect(rows[0].categoryName).toBe('Sosial')
    expect(rows[0].categoryColor).toBe('#b91c1c')
  })

  it('tanpa periode -> daftar kosong tanpa query', async () => {
    const rows = await listRecentTransactions('', 5)

    expect(rows).toEqual([])
    expect(h.txFindManyMock).not.toHaveBeenCalled()
  })
})
