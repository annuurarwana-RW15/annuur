import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  sectionFindUniqueMock: vi.fn(),
  sectionCreateMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    section: {
      findUnique: h.sectionFindUniqueMock,
      create: h.sectionCreateMock,
    },
  },
}))

import { ensureDefaultSections, resetSectionsCache } from '@/lib/sections-init'

describe('ensureDefaultSections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSectionsCache()
  })

  it('mengembalikan ID yang ada jika footer, tiktok, kontak, proposal, dan program sudah ada di database', async () => {
    h.sectionFindUniqueMock.mockImplementation(({ where: { key } }: { where: { key: string } }) => {
      if (key === 'footer') return Promise.resolve({ id: 'footer-1', key: 'footer' })
      if (key === 'tiktok') return Promise.resolve({ id: 'tiktok-1', key: 'tiktok' })
      if (key === 'kontak') return Promise.resolve({ id: 'kontak-1', key: 'kontak' })
      if (key === 'proposal') return Promise.resolve({ id: 'proposal-1', key: 'proposal' })
      if (key === 'program') return Promise.resolve({ id: 'program-1', key: 'program' })
      return Promise.resolve(null)
    })

    const result = await ensureDefaultSections()

    expect(result).toEqual({
      footerId: 'footer-1',
      tiktokId: 'tiktok-1',
      kontakId: 'kontak-1',
      proposalId: 'proposal-1',
      programId: 'program-1',
    })
    expect(h.sectionCreateMock).not.toHaveBeenCalled()
  })

  it('membuat tiktok, proposal, dan program section jika belum ada di database', async () => {
    h.sectionFindUniqueMock.mockImplementation(({ where: { key } }: { where: { key: string } }) => {
      if (key === 'footer') return Promise.resolve({ id: 'footer-1', key: 'footer' })
      if (key === 'kontak') return Promise.resolve({ id: 'kontak-1', key: 'kontak' })
      return Promise.resolve(null)
    })
    h.sectionCreateMock.mockImplementation(({ data: { key } }: { data: { key: string } }) => {
      return Promise.resolve({ id: `${key}-new`, key })
    })

    const result = await ensureDefaultSections()

    expect(result).toEqual({
      footerId: 'footer-1',
      tiktokId: 'tiktok-new',
      kontakId: 'kontak-1',
      proposalId: 'proposal-new',
      programId: 'program-new',
    })
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'tiktok',
          title: 'Feed TikTok Official',
          order: 6,
          isVisible: true,
        }),
      }),
    )
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'proposal',
          title: 'Proposal Terbuka Pilihan',
          order: 6,
          isVisible: true,
        }),
      }),
    )
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'program',
          title: 'Program Kerja Strategis',
          order: 7,
          isVisible: true,
        }),
      }),
    )
  })
})

