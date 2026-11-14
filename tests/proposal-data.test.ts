import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  proposalFindMany: vi.fn(),
  proposalFindUnique: vi.fn(),
  proposalFindFirst: vi.fn(),
  proposalCreate: vi.fn(),
  proposalUpdate: vi.fn(),
  proposalDelete: vi.fn(),
  donationAggregate: vi.fn(),
  donationCount: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    proposal: {
      findMany: h.proposalFindMany,
      findUnique: h.proposalFindUnique,
      findFirst: h.proposalFindFirst,
      create: h.proposalCreate,
      update: h.proposalUpdate,
      delete: h.proposalDelete,
    },
    donation: {
      aggregate: h.donationAggregate,
      count: h.donationCount,
    },
  },
}))

import {
  getAllProposals,
  getProposalBySlug,
  uniqueProposalSlug,
  calculateProposalFunding,
} from '@/lib/proposal'

describe('Proposal Data Access & Funding Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAllProposals queries proposals with optional filters', async () => {
    h.proposalFindMany.mockResolvedValueOnce([
      {
        id: 'prop-1',
        title: 'Penggantian Karpet Utama Masjid',
        slug: 'penggantian-karpet-utama-masjid',
        targetAmount: 50000000,
        collectedManual: 10000000,
        categoryId: 'cat-1',
        status: 'DIBUKA',
        isFeatured: true,
      },
    ])

    const res = await getAllProposals({ status: 'DIBUKA', featuredOnly: true })
    expect(res).toHaveLength(1)
    expect(h.proposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'DIBUKA',
          isFeatured: true,
        }),
      }),
    )
  })

  it('getProposalBySlug returns proposal with category and program relations', async () => {
    h.proposalFindUnique.mockResolvedValueOnce({
      id: 'prop-1',
      title: 'Penggantian Karpet',
      slug: 'penggantian-karpet',
      category: { id: 'c1', name: 'Infaq Sarana' },
      program: { id: 'p1', title: 'Renovasi Interior' },
    })

    const prop = await getProposalBySlug('penggantian-karpet')
    expect(prop?.title).toBe('Penggantian Karpet')
    expect(h.proposalFindUnique).toHaveBeenCalledWith({
      where: { slug: 'penggantian-karpet' },
      include: { category: true, program: true },
    })
  })

  it('uniqueProposalSlug generates unique slug', async () => {
    h.proposalFindFirst
      .mockResolvedValueOnce({ id: 'colliding-id' })
      .mockResolvedValueOnce(null)

    const slug = await uniqueProposalSlug('Renovasi Menara')
    expect(slug).toBe('renovasi-menara-2')
  })

  it('calculateProposalFunding combines manual collections and confirmed online donations', async () => {
    h.donationAggregate.mockResolvedValueOnce({
      _sum: { amount: 15000000 },
    })
    h.donationCount.mockResolvedValueOnce(5)

    const proposal = {
      id: 'prop-1',
      targetAmount: 50000000,
      collectedManual: 10000000,
      categoryId: 'cat-sarana',
    }

    const funding = await calculateProposalFunding(proposal)
    expect(funding.targetAmount).toBe(50000000)
    expect(funding.onlineDonationsTotal).toBe(15000000)
    expect(funding.collectedTotal).toBe(25000000) // 10M manual + 15M online
    expect(funding.percentage).toBe(50) // 25 / 50 * 100
    expect(funding.remaining).toBe(25000000)
    expect(funding.isFulfilled).toBe(false)
    expect(funding.onlineDonationsCount).toBe(5)
  })

  it('calculateProposalFunding works without categoryId (only manual collections)', async () => {
    const proposal = {
      id: 'prop-2',
      targetAmount: 20000000,
      collectedManual: 20000000,
      categoryId: null,
    }

    const funding = await calculateProposalFunding(proposal)
    expect(funding.onlineDonationsTotal).toBe(0)
    expect(funding.collectedTotal).toBe(20000000)
    expect(funding.percentage).toBe(100)
    expect(funding.remaining).toBe(0)
    expect(funding.isFulfilled).toBe(true)
    expect(h.donationAggregate).not.toHaveBeenCalled()
  })
})

