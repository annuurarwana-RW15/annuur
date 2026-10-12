import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@prisma/client'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  categoryCreateMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
  categoryDeleteMock: vi.fn(),
  periodFindUniqueMock: vi.fn(),
  periodFindFirstMock: vi.fn(),
  periodCreateMock: vi.fn(),
  periodUpdateMock: vi.fn(),
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
    category: {
      findUnique: h.categoryFindUniqueMock,
      create: h.categoryCreateMock,
      update: h.categoryUpdateMock,
      delete: h.categoryDeleteMock,
    },
    period: {
      findUnique: h.periodFindUniqueMock,
      findFirst: h.periodFindFirstMock,
      create: h.periodCreateMock,
      update: h.periodUpdateMock,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePathMock }))

import {
  deleteCategory,
  saveCategory,
} from '@/app/admin/(dashboard)/kas/kategori/actions'
import { closePeriod, openPeriod } from '@/app/admin/(dashboard)/kas/periode/actions'

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

/** PrismaClientKnownRequestError tiruan (prismaError P2002/P2003). */
function prismaError(code: string): Error {
  const err = new Error(`Prisma error ${code}`) as Error & { code: string }
  err.name = 'PrismaClientKnownRequestError'
  err.code = code
  return err
}

beforeEach(() => {
  vi.clearAllMocks()
  loginAs('ADMIN')
  h.periodFindFirstMock.mockResolvedValue(null)
  h.periodFindUniqueMock.mockResolvedValue(null)
  h.categoryFindUniqueMock.mockResolvedValue(null)
})

describe('openPeriod', () => {
  it('periode baru: create status AKTIF dengan tanggal di-parse dari string', async () => {
    h.periodCreateMock.mockResolvedValue({ id: 'p2' })

    const result = await openPeriod({
      name: '2027',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    })

    expect(result).toEqual({ ok: true })
    expect(h.periodCreateMock).toHaveBeenCalledWith({
      data: {
        name: '2027',
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-12-31'),
        status: 'AKTIF',
      },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/periode')
  })

  it('nama duplikat (P2002) -> {ok:false, error:Periode sudah ada}', async () => {
    h.periodCreateMock.mockRejectedValue(prismaError('P2002'))

    const result = await openPeriod({
      name: '2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })

    expect(result).toEqual({ ok: false, error: 'Periode sudah ada' })
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('masih ada periode AKTIF -> {ok:false, error:Tutup periode aktif dulu} tanpa create', async () => {
    h.periodFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: '2026',
      status: 'AKTIF',
    })

    const result = await openPeriod({
      name: '2027',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    })

    expect(result).toEqual({ ok: false, error: 'Tutup periode aktif dulu' })
    expect(h.periodCreateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('nama kosong -> {ok:false} tanpa menyentuh database', async () => {
    const result = await openPeriod({
      name: '   ',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    })

    expect(result.ok).toBe(false)
    expect(h.periodFindFirstMock).not.toHaveBeenCalled()
    expect(h.periodCreateMock).not.toHaveBeenCalled()
  })

  it('tanggal selesai sebelum mulai -> {ok:false} tanpa database', async () => {
    const result = await openPeriod({
      name: '2027',
      startDate: '2027-12-31',
      endDate: '2027-01-01',
    })

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.periodCreateMock).not.toHaveBeenCalled()
  })

  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(
      openPeriod({ name: '2027', startDate: '2027-01-01', endDate: '2027-12-31' }),
    ).rejects.toThrow('Akses ditolak')

    expect(h.periodFindFirstMock).not.toHaveBeenCalled()
    expect(h.periodCreateMock).not.toHaveBeenCalled()
  })

  it('BENDAHARA diizinkan membuka periode', async () => {
    loginAs('BENDAHARA')
    h.periodCreateMock.mockResolvedValue({ id: 'p2' })

    const result = await openPeriod({
      name: '2027',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    })

    expect(result).toEqual({ ok: true })
    expect(h.periodCreateMock).toHaveBeenCalledTimes(1)
  })
})

describe('closePeriod', () => {
  it('menutup periode: status DITUTUP + closedAt now + closedBy sesi', async () => {
    h.periodFindUniqueMock.mockResolvedValue({
      id: 'p1',
      name: '2026',
      status: 'AKTIF',
      closedAt: null,
      closedBy: null,
    })
    h.periodUpdateMock.mockResolvedValue({})

    const result = await closePeriod('p1')

    expect(result).toEqual({ ok: true })
    expect(h.periodUpdateMock).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        status: 'DITUTUP',
        closedAt: expect.any(Date),
        closedBy: 'u-1',
      },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/periode')
  })

  it('menutup dua kali -> {ok:false} tanpa update kedua', async () => {
    h.periodFindUniqueMock.mockResolvedValue({
      id: 'p1',
      name: '2026',
      status: 'DITUTUP',
      closedAt: new Date('2026-12-31T00:00:00.000Z'),
      closedBy: 'u-1',
    })

    const result = await closePeriod('p1')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.periodUpdateMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id tidak ditemukan -> {ok:false} tanpa update', async () => {
    const result = await closePeriod('hilang')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.periodUpdateMock).not.toHaveBeenCalled()
  })

  it('VIEWER melempar "Akses ditolak" tanpa update', async () => {
    loginAs('VIEWER')

    await expect(closePeriod('p1')).rejects.toThrow('Akses ditolak')
    expect(h.periodFindUniqueMock).not.toHaveBeenCalled()
    expect(h.periodUpdateMock).not.toHaveBeenCalled()
  })

  it('BENDAHARA diizinkan menutup periode', async () => {
    loginAs('BENDAHARA')
    h.periodFindUniqueMock.mockResolvedValue({
      id: 'p1',
      name: '2026',
      status: 'AKTIF',
      closedAt: null,
      closedBy: null,
    })
    h.periodUpdateMock.mockResolvedValue({})

    const result = await closePeriod('p1')

    expect(result).toEqual({ ok: true })
    expect(h.periodUpdateMock).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({ status: 'DITUTUP', closedBy: 'u-1' }),
    })
  })
})

describe('deleteCategory', () => {
  it('kategori tanpa transaksi: hapus + revalidate halaman kas', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({ id: 'c1', name: 'Infak' })
    h.categoryDeleteMock.mockResolvedValue({})

    const result = await deleteCategory('c1')

    expect(result).toEqual({ ok: true })
    expect(h.categoryDeleteMock).toHaveBeenCalledWith({ where: { id: 'c1' } })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/kategori')
  })

  it('dipakai transaksi (P2003) -> {ok:false, error:Kategori masih dipakai transaksi}', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({ id: 'c1', name: 'Infak' })
    h.categoryDeleteMock.mockRejectedValue(prismaError('P2003'))

    const result = await deleteCategory('c1')

    expect(result).toEqual({
      ok: false,
      error: 'Kategori masih dipakai transaksi',
    })
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('dipakai transaksi (pesan driver FK/RESTRICT) -> pesan yang sama', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({ id: 'c1', name: 'Infak' })
    h.categoryDeleteMock.mockRejectedValue(
      new Error(
        'update or delete on table "Category" violates foreign key constraint "Transaction_categoryId_fkey" on table "Transaction" [RESTRICT]',
      ),
    )

    const result = await deleteCategory('c1')

    expect(result).toEqual({
      ok: false,
      error: 'Kategori masih dipakai transaksi',
    })
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })

  it('id tidak ditemukan -> {ok:false} tanpa delete', async () => {
    const result = await deleteCategory('hilang')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(h.categoryDeleteMock).not.toHaveBeenCalled()
  })

  it('VIEWER melempar "Akses ditolak" tanpa delete', async () => {
    loginAs('VIEWER')

    await expect(deleteCategory('c1')).rejects.toThrow('Akses ditolak')
    expect(h.categoryDeleteMock).not.toHaveBeenCalled()
    expect(h.revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('saveCategory', () => {
  it('VIEWER melempar "Akses ditolak" tanpa menyentuh database', async () => {
    loginAs('VIEWER')

    await expect(
      saveCategory({ name: 'Infak', type: 'MASUK', isActive: true }),
    ).rejects.toThrow('Akses ditolak')
    expect(h.categoryCreateMock).not.toHaveBeenCalled()
    expect(h.categoryUpdateMock).not.toHaveBeenCalled()
  })

  it('nama kosong -> {ok:false} tanpa menyentuh database', async () => {
    const result = await saveCategory({
      name: '   ',
      type: 'KELUAR',
      isActive: true,
    })

    expect(result.ok).toBe(false)
    expect(h.categoryCreateMock).not.toHaveBeenCalled()
    expect(h.categoryUpdateMock).not.toHaveBeenCalled()
  })

  it('create: data tervalidasi tersimpan + revalidate (warna kosong -> null)', async () => {
    h.categoryCreateMock.mockResolvedValue({ id: 'c1' })

    const result = await saveCategory({
      name: 'Donasi',
      type: 'MASUK',
      color: '',
      isActive: false,
    })

    expect(result).toEqual({ ok: true })
    expect(h.categoryCreateMock).toHaveBeenCalledWith({
      data: {
        name: 'Donasi',
        type: 'MASUK',
        color: null,
        isActive: false,
      },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/admin/kas/kategori')
  })

  it('update: id ada -> update; id hilang -> {ok:false} tanpa update', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({ id: 'c1', name: 'Infak' })
    h.categoryUpdateMock.mockResolvedValue({})

    const okResult = await saveCategory({
      id: 'c1',
      name: 'Infak Harian',
      type: 'MASUK',
      color: '#123456',
      isActive: true,
    })

    expect(okResult).toEqual({ ok: true })
    expect(h.categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        name: 'Infak Harian',
        type: 'MASUK',
        color: '#123456',
        isActive: true,
      },
    })

    h.categoryFindUniqueMock.mockResolvedValue(null)
    const missing = await saveCategory({
      id: 'hilang',
      name: 'X',
      type: 'KELUAR',
      isActive: true,
    })
    expect(missing.ok).toBe(false)
    expect(h.categoryUpdateMock).toHaveBeenCalledTimes(1)
  })
})
