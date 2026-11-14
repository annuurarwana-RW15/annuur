import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  proposalFindUnique: vi.fn(),
  proposalFindFirst: vi.fn(),
  proposalCreate: vi.fn(),
  proposalUpdate: vi.fn(),
  proposalDelete: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  requireRole: h.requireRoleMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePathMock,
}))

vi.mock('@/lib/db', () => ({
  db: {
    proposal: {
      findUnique: h.proposalFindUnique,
      findFirst: h.proposalFindFirst,
      create: h.proposalCreate,
      update: h.proposalUpdate,
      delete: h.proposalDelete,
    },
  },
}))

import {
  saveProposal,
  deleteProposalAction,
} from '@/app/admin/(dashboard)/proposal/actions'

describe('Admin Proposal Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.requireRoleMock.mockResolvedValue({ id: 'u1', role: 'ADMIN' })
  })

  it('saveProposal fails when title or targetAmount <= 0', async () => {
    const res = await saveProposal({
      title: '',
      summary: 'Ringkasan',
      description: 'Deskripsi',
      targetAmount: 0,
      status: 'DIBUKA',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/judul/i)

    const res2 = await saveProposal({
      title: 'Proposal Bagus',
      summary: 'Ringkasan',
      description: 'Deskripsi',
      targetAmount: -1000,
      status: 'DIBUKA',
    })
    expect(res2.ok).toBe(false)
    expect(res2.error).toMatch(/target anggaran/i)
  })

  it('saveProposal creates proposal with unique slug', async () => {
    h.proposalFindFirst.mockResolvedValueOnce(null)
    h.proposalCreate.mockResolvedValueOnce({
      id: 'prop-1',
      title: 'Renovasi Kubah',
      slug: 'renovasi-kubah',
    })

    const res = await saveProposal({
      title: 'Renovasi Kubah',
      summary: 'Pengecatan dan perbaikan rangka kubah masjid',
      description: 'Rincian kebutuhan bahan...',
      targetAmount: 40000000,
      collectedManual: 5000000,
      filePdf: '/uploads/kubah.pdf',
      filePdfSize: '2.5 MB',
      status: 'DIBUKA',
      isFeatured: true,
    })

    expect(res.ok).toBe(true)
    expect(h.proposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Renovasi Kubah',
          slug: 'renovasi-kubah',
          targetAmount: 40000000,
          collectedManual: 5000000,
          filePdf: '/uploads/kubah.pdf',
          isFeatured: true,
        }),
      }),
    )
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/proposal')
  })

  it('deleteProposalAction removes proposal and revalidates paths', async () => {
    h.proposalDelete.mockResolvedValueOnce({ id: 'prop-1' })

    const res = await deleteProposalAction('prop-1')
    expect(res.ok).toBe(true)
    expect(h.proposalDelete).toHaveBeenCalledWith({ where: { id: 'prop-1' } })
    expect(h.revalidatePathMock).toHaveBeenCalledWith('/proposal')
  })
})

