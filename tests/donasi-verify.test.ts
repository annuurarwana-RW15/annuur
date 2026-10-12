import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  donationFindUniqueMock: vi.fn(),
  donationUpdateMock: vi.fn(),
  transactionMock: vi.fn(), // db.$transaction — menjalankan callback dengan client tx
  periodFindFirstMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  categoryFindFirstMock: vi.fn(),
  txCreateMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/db', () => {
  // Client tx = client db yang sama: $transaction menjalankan callback langsung.
  const db = {
    user: { findUnique: h.userFindUniqueMock },
    donation: {
      findUnique: h.donationFindUniqueMock,
      update: h.donationUpdateMock,
    },
    period: { findFirst: h.periodFindFirstMock },
    category: {
      findUnique: h.categoryFindUniqueMock,
      findFirst: h.categoryFindFirstMock,
    },
    transaction: { create: h.txCreateMock },
    $transaction: h.transactionMock,
  }
  h.transactionMock.mockImplementation(async (fn: (tx: typeof db) => unknown) =>
    fn(db),
  )
  return { db }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import { verifyDonation } from '@/app/admin/(dashboard)/donasi/actions'

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

const MENUNGGU = {
  id: 'd-1',
  donorName: 'Ahmad Fauzi',
  amount: 150000,
  categoryId: 'c-infaq' as string | null,
  message: 'Semoga berkah',
  proofImage: 'https://cdn.example.com/bukti.jpg',
  reference: 'DON-ABC12345',
  status: 'MENUNGGU' as const,
  rejectNote: null,
  verifiedById: null,
  verifiedAt: null,
  createdAt: new Date('2026-10-01T03:00:00Z'),
}

const ACTIVE_PERIOD = {
  id: 'p-2026',
  name: '2026',
  status: 'AKTIF' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
}

const VERIFY_PATHS = [
  '/admin/donasi',
  '/admin',
  '/admin/kas/transaksi',
  '/laporan-kas',
  '/',
] as const

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  h.donationFindUniqueMock.mockResolvedValue(MENUNGGU)
  h.donationUpdateMock.mockResolvedValue({})
  h.periodFindFirstMock.mockResolvedValue(ACTIVE_PERIOD)
  h.categoryFindUniqueMock.mockResolvedValue({
    id: 'c-infaq',
    type: 'MASUK',
    isActive: true,
  })
  h.categoryFindFirstMock.mockResolvedValue(null)
  h.txCreateMock.mockResolvedValue({ id: 'tx-1' })
})

describe('verifyDonation — confirm', () => {
  it('happy path: $transaction membuat transaksi MASUK + update DIKONFIRMASI + revalidate', async () => {
    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: true })
    expect(h.transactionMock).toHaveBeenCalledTimes(1)
    expect(h.periodFindFirstMock).toHaveBeenCalledWith({
      where: { status: 'AKTIF' },
      orderBy: { startDate: 'desc' },
    })
    expect(h.txCreateMock).toHaveBeenCalledWith({
      data: {
        type: 'MASUK',
        amount: 150000,
        date: expect.any(Date),
        description: 'Donasi Ahmad Fauzi (DON-ABC12345)',
        categoryId: 'c-infaq',
        periodId: 'p-2026',
        donationId: 'd-1',
        createdBy: 'u-1',
      },
    })
    expect(h.donationUpdateMock).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: {
        status: 'DIKONFIRMASI',
        verifiedById: 'u-1',
        verifiedAt: expect.any(Date),
      },
    })
    for (const path of VERIFY_PATHS) {
      expect(h.revalidatePathMock).toHaveBeenCalledWith(path)
    }
  })

  it('confirm dua kali → kedua {ok:false,Sudah diproses} tanpa $transaction kedua', async () => {
    const first = await verifyDonation('d-1', 'confirm')
    expect(first).toEqual({ ok: true })

    // Baris kedua datang dengan status sudah berubah (hasil confirm pertama).
    h.donationFindUniqueMock.mockResolvedValue({
      ...MENUNGGU,
      status: 'DIKONFIRMASI',
    })
    const second = await verifyDonation('d-1', 'confirm')

    expect(second).toEqual({ ok: false, error: 'Sudah diproses' })
    expect(h.transactionMock).toHaveBeenCalledTimes(1)
    expect(h.donationUpdateMock).toHaveBeenCalledTimes(1)
  })

  it('tanpa periode aktif → {ok:false,Tidak ada periode aktif} tanpa create transaksi', async () => {
    h.periodFindFirstMock.mockResolvedValue(null)

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: false, error: 'Tidak ada periode aktif' })
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.donationUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('categoryId donasi null → fallback kategori MASUK aktif pertama', async () => {
    h.donationFindUniqueMock.mockResolvedValue({ ...MENUNGGU, categoryId: null })
    h.categoryFindFirstMock.mockResolvedValue({
      id: 'c-umum',
      type: 'MASUK',
      isActive: true,
    })

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: true })
    expect(h.categoryFindUniqueMock).not.toHaveBeenCalled()
    expect(h.txCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: 'c-umum' }),
      }),
    )
  })

  it('kategori donasi tidak valid (KELUAR/nonaktif) → fallback ke MASUK aktif', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({
      id: 'c-belanja',
      type: 'KELUAR',
      isActive: true,
    })
    h.categoryFindFirstMock.mockResolvedValue({
      id: 'c-umum',
      type: 'MASUK',
      isActive: true,
    })

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: true })
    expect(h.txCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: 'c-umum' }),
      }),
    )
  })

  it('tanpa kategori valid sama sekali → {ok:false,Kategori tidak ditemukan}', async () => {
    h.donationFindUniqueMock.mockResolvedValue({ ...MENUNGGU, categoryId: null })
    h.categoryFindFirstMock.mockResolvedValue(null)

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: false, error: 'Kategori tidak ditemukan' })
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.donationUpdateMock).not.toHaveBeenCalled()
  })

  it('donasi tidak ditemukan → {ok:false,Donasi tidak ditemukan}', async () => {
    h.donationFindUniqueMock.mockResolvedValue(null)

    const result = await verifyDonation('hilang', 'confirm')

    expect(result).toEqual({ ok: false, error: 'Donasi tidak ditemukan' })
    expect(h.transactionMock).not.toHaveBeenCalled()
  })

  it('error Prisma di dalam $transaction → {ok:false,Gagal memproses} + console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // P2002: donasi dikonfirmasi dua kali bersamaan (donationId unique).
    h.txCreateMock.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    )

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: false, error: 'Gagal memproses' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('verifyDonation — reject', () => {
  it('catatan kosong / <2 karakter → {ok:false,Catatan penolakan wajib diisi} tanpa update', async () => {
    const kosong = await verifyDonation('d-1', 'reject', '  ')
    const pendek = await verifyDonation('d-1', 'reject', 'x')

    expect(kosong).toEqual({ ok: false, error: 'Catatan penolakan wajib diisi' })
    expect(pendek).toEqual({ ok: false, error: 'Catatan penolakan wajib diisi' })
    expect(h.donationUpdateMock).not.toHaveBeenCalled()
    expect(h.transactionMock).not.toHaveBeenCalled()
  })

  it('happy path: update DITOLAK + rejectNote, tanpa transaksi & tanpa periode aktif', async () => {
    const result = await verifyDonation('d-1', 'reject', 'Transfer tidak cocok')

    expect(result).toEqual({ ok: true })
    expect(h.donationUpdateMock).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: {
        status: 'DITOLAK',
        rejectNote: 'Transfer tidak cocok',
        verifiedById: 'u-1',
        verifiedAt: expect.any(Date),
      },
    })
    expect(h.transactionMock).not.toHaveBeenCalled()
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.periodFindFirstMock).not.toHaveBeenCalled()
    for (const path of VERIFY_PATHS) {
      expect(h.revalidatePathMock).toHaveBeenCalledWith(path)
    }
  })

  it('reject donasi non-MENUNGGU → {ok:false,Sudah diproses} tanpa update', async () => {
    h.donationFindUniqueMock.mockResolvedValue({
      ...MENUNGGU,
      status: 'DITOLAK',
      rejectNote: 'catatan lama',
    })

    const result = await verifyDonation('d-1', 'reject', 'catatan baru')

    expect(result).toEqual({ ok: false, error: 'Sudah diproses' })
    expect(h.donationUpdateMock).not.toHaveBeenCalled()
  })
})

describe('verifyDonation — RBAC', () => {
  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(verifyDonation('d-1', 'confirm')).rejects.toThrow(
      'Akses ditolak',
    )

    expect(h.donationFindUniqueMock).not.toHaveBeenCalled()
    expect(h.donationUpdateMock).not.toHaveBeenCalled()
    expect(h.transactionMock).not.toHaveBeenCalled()
    expect(h.txCreateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('BENDAHARA diizinkan memverifikasi', async () => {
    loginAs('BENDAHARA')

    const result = await verifyDonation('d-1', 'confirm')

    expect(result).toEqual({ ok: true })
    expect(h.txCreateMock).toHaveBeenCalledTimes(1)
  })
})
