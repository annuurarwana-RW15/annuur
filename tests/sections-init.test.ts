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

  it('mengembalikan ID yang ada jika footer, tiktok, kontak, proposal, program, keuangan, quran, dan donasi sudah ada di database', async () => {
    h.sectionFindUniqueMock.mockImplementation(({ where: { key } }: { where: { key: string } }) => {
      if (key === 'footer') return Promise.resolve({ id: 'footer-1', key: 'footer' })
      if (key === 'tiktok') return Promise.resolve({ id: 'tiktok-1', key: 'tiktok' })
      if (key === 'kontak') return Promise.resolve({ id: 'kontak-1', key: 'kontak' })
      if (key === 'proposal') return Promise.resolve({ id: 'proposal-1', key: 'proposal' })
      if (key === 'program') return Promise.resolve({ id: 'program-1', key: 'program' })
      if (key === 'keuangan') return Promise.resolve({ id: 'keuangan-1', key: 'keuangan' })
      if (key === 'quran') return Promise.resolve({ id: 'quran-1', key: 'quran' })
      if (key === 'donasi') return Promise.resolve({ id: 'donasi-1', key: 'donasi' })
      return Promise.resolve(null)
    })

    const result = await ensureDefaultSections()

    expect(result).toEqual({
      footerId: 'footer-1',
      tiktokId: 'tiktok-1',
      kontakId: 'kontak-1',
      proposalId: 'proposal-1',
      programId: 'program-1',
      keuanganId: 'keuangan-1',
      quranId: 'quran-1',
      donasiId: 'donasi-1',
    })
    expect(h.sectionCreateMock).not.toHaveBeenCalled()
  })

  it('membuat tiktok, proposal, program, keuangan, quran, dan donasi section jika belum ada di database', async () => {
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
      keuanganId: 'keuangan-new',
      quranId: 'quran-new',
      donasiId: 'donasi-new',
    })
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'keuangan',
          title: 'Laporan Keuangan Kas',
          order: 4,
          isVisible: true,
        }),
      }),
    )
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'quran',
          title: 'Murottal Al-Qur\'an 30 Juz',
          order: 5,
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
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'donasi',
          title: 'Salurkan Infaq & Sedekah Terbaik Anda',
          order: 8,
          isVisible: true,
        }),
      }),
    )
    expect(h.sectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'tiktok',
          title: 'Feed TikTok Official',
          order: 11,
          isVisible: true,
        }),
      }),
    )
  })
})

