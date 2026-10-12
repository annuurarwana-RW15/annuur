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
import { getPeriodBalance } from '@/lib/kas'

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
