import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  requireRole: h.requireRoleMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePathMock,
}))

vi.mock('@/lib/db', () => ({
  db: {
    program: {
      findUnique: h.findUniqueMock,
      findFirst: h.findFirstMock,
      create: h.createMock,
      update: h.updateMock,
      delete: h.deleteMock,
    },
  },
}))

import {
  saveProgram,
  updateQuickProgress,
  deleteProgramAction,
} from '@/app/admin/(dashboard)/program/actions'

describe('Admin Program Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.requireRoleMock.mockResolvedValue({ id: 'u1', role: 'ADMIN' })
  })

  it('saveProgram fails when title or description is empty', async () => {
    const res = await saveProgram({
      title: '  ',
      description: 'Deskripsi',
      periodType: 'PENDEK',
      category: 'IMARAH',
      status: 'DIRENCANAKAN',
      progress: 0,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/judul/i)
  })

  it('saveProgram creates new program with auto-generated slug', async () => {
    h.findFirstMock.mockResolvedValueOnce(null)
    h.createMock.mockResolvedValueOnce({ id: 'p-new', title: 'Program Baru' })

    const res = await saveProgram({
      title: 'Program Kerja Unggulan',
      description: 'Rincian program kerja...',
      periodType: 'PENDEK',
      category: 'IMARAH',
      status: 'DIRENCANAKAN',
      progress: 25,
      budgetEstimate: 10000000,
    })

    expect(res.ok).toBe(true)
    expect(h.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Program Kerja Unggulan',
          slug: 'program-kerja-unggulan',
          progress: 25,
        }),
      }),
    )
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/program')
  })

  it('updateQuickProgress validates role and updates clamped progress', async () => {
    h.updateMock.mockResolvedValueOnce({ id: 'p1', progress: 85 })

    const res = await updateQuickProgress('p1', 85)
    expect(res.ok).toBe(true)
    expect(h.updateMock).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { progress: 85 },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/program')
  })

  it('deleteProgramAction deletes program by ID', async () => {
    h.deleteMock.mockResolvedValueOnce({ id: 'p1' })

    const res = await deleteProgramAction('p1')
    expect(res.ok).toBe(true)
    expect(h.deleteMock).toHaveBeenCalledWith({
      where: { id: 'p1' },
    })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/program')
  })
})

