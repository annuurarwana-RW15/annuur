import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    program: {
      findMany: h.findMany,
      findUnique: h.findUnique,
      findFirst: h.findFirst,
      create: h.create,
      update: h.update,
      delete: h.delete,
    },
  },
}))

import {
  getAllPrograms,
  getProgramBySlug,
  uniqueProgramSlug,
  updateProgramProgress,
} from '@/lib/program'

describe('Program Data Access & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAllPrograms queries programs with optional filters and sorting', async () => {
    h.findMany.mockResolvedValueOnce([
      {
        id: 'prog-1',
        title: 'Kajian Rutin Ahad Subuh',
        slug: 'kajian-rutin-ahad-subuh',
        periodType: 'PENDEK',
        category: 'IMARAH',
        status: 'BERJALAN',
        progress: 75,
      },
    ])

    const result = await getAllPrograms({ periodType: 'PENDEK', status: 'BERJALAN' })
    expect(result).toHaveLength(1)
    expect(h.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          periodType: 'PENDEK',
          status: 'BERJALAN',
        }),
      }),
    )
  })

  it('getProgramBySlug returns a single program by unique slug with proposals', async () => {
    h.findUnique.mockResolvedValueOnce({
      id: 'prog-1',
      title: 'Renovasi Tempat Wudhu',
      slug: 'renovasi-tempat-wudhu',
      periodType: 'PANJANG',
      category: 'RIAYAH',
      proposals: [],
    })

    const prog = await getProgramBySlug('renovasi-tempat-wudhu')
    expect(prog?.title).toBe('Renovasi Tempat Wudhu')
    expect(h.findUnique).toHaveBeenCalledWith({
      where: { slug: 'renovasi-tempat-wudhu' },
      include: { proposals: true },
    })
  })

  it('uniqueProgramSlug generates clean unique slug avoiding collision', async () => {
    h.findFirst
      .mockResolvedValueOnce({ id: 'existing-1' }) // first try collides
      .mockResolvedValueOnce(null) // second try free

    const slug = await uniqueProgramSlug('Pengadaan Sound System')
    expect(slug).toBe('pengadaan-sound-system-2')
  })

  it('updateProgramProgress clamps progress between 0 and 100', async () => {
    h.update.mockResolvedValueOnce({ id: 'p1', progress: 100 })

    await updateProgramProgress('p1', 120)
    expect(h.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { progress: 100 },
    })

    await updateProgramProgress('p1', -15)
    expect(h.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { progress: 0 },
    })
  })
})

