import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createDatabaseBackup } from '@/lib/database-backup'
import { validateBackupPayload } from '@/lib/database-restore'

const mockUserFindMany = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockArticleFindMany = vi.fn()
const mockPeriodFindMany = vi.fn()
const mockCategoryFindMany = vi.fn()
const mockSettingFindMany = vi.fn()
const mockSectionFindMany = vi.fn()
const mockDonationFindMany = vi.fn()
const mockProgramFindMany = vi.fn()
const mockProposalFindMany = vi.fn()
const mockInventoryItemFindMany = vi.fn()
const mockInventoryLoanFindMany = vi.fn()
const mockInventoryLoanItemFindMany = vi.fn()
const mockInventoryAcquisitionFindMany = vi.fn()
const mockTrackFindMany = vi.fn()
const mockPageViewFindMany = vi.fn()
const mockPrayerTimeCacheFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: (...args: unknown[]) => mockUserFindMany(...args) },
    transaction: { findMany: (...args: unknown[]) => mockTransactionFindMany(...args) },
    article: { findMany: (...args: unknown[]) => mockArticleFindMany(...args) },
    period: { findMany: (...args: unknown[]) => mockPeriodFindMany(...args) },
    category: { findMany: (...args: unknown[]) => mockCategoryFindMany(...args) },
    setting: { findMany: (...args: unknown[]) => mockSettingFindMany(...args) },
    section: { findMany: (...args: unknown[]) => mockSectionFindMany(...args) },
    donation: { findMany: (...args: unknown[]) => mockDonationFindMany(...args) },
    program: { findMany: (...args: unknown[]) => mockProgramFindMany(...args) },
    proposal: { findMany: (...args: unknown[]) => mockProposalFindMany(...args) },
    inventoryItem: { findMany: (...args: unknown[]) => mockInventoryItemFindMany(...args) },
    inventoryLoan: { findMany: (...args: unknown[]) => mockInventoryLoanFindMany(...args) },
    inventoryLoanItem: { findMany: (...args: unknown[]) => mockInventoryLoanItemFindMany(...args) },
    inventoryAcquisition: { findMany: (...args: unknown[]) => mockInventoryAcquisitionFindMany(...args) },
    track: { findMany: (...args: unknown[]) => mockTrackFindMany(...args) },
    pageView: { findMany: (...args: unknown[]) => mockPageViewFindMany(...args) },
    prayerTimeCache: { findMany: (...args: unknown[]) => mockPrayerTimeCacheFindMany(...args) },
    $transaction: vi.fn(),
  },
}))

describe('createDatabaseBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindMany.mockResolvedValue([{ id: 'u1', name: 'Admin' }])
    mockTransactionFindMany.mockResolvedValue([{ id: 't1', amount: '100000' }])
    mockArticleFindMany.mockResolvedValue([])
    mockPeriodFindMany.mockResolvedValue([])
    mockCategoryFindMany.mockResolvedValue([])
    mockSettingFindMany.mockResolvedValue([])
    mockSectionFindMany.mockResolvedValue([])
    mockDonationFindMany.mockResolvedValue([])
    mockProgramFindMany.mockResolvedValue([])
    mockProposalFindMany.mockResolvedValue([])
    mockInventoryItemFindMany.mockResolvedValue([])
    mockInventoryLoanFindMany.mockResolvedValue([])
    mockInventoryLoanItemFindMany.mockResolvedValue([])
    mockInventoryAcquisitionFindMany.mockResolvedValue([])
    mockTrackFindMany.mockResolvedValue([])
    mockPageViewFindMany.mockResolvedValue([])
    mockPrayerTimeCacheFindMany.mockResolvedValue([])
  })

  it('menghasilkan payload backup dengan metadata dan summary yang tepat', async () => {
    const backup = await createDatabaseBackup()
    expect(backup.version).toBe(1)
    expect(backup.site).toBe('Masjid An-nuur Arwana')
    expect(backup.summary.user).toBe(1)
    expect(backup.summary.transaction).toBe(1)
    expect(backup.tables.user).toHaveLength(1)
    expect(backup.tables.transaction).toHaveLength(1)
  })
})

describe('validateBackupPayload', () => {
  it('menolak string kosong atau non-JSON', () => {
    expect(validateBackupPayload('').valid).toBe(false)
    expect(validateBackupPayload('bukan json').valid).toBe(false)
  })

  it('menolak payload tanpa versi atau tanpa tabel', () => {
    const noVer = JSON.stringify({ tables: {} })
    expect(validateBackupPayload(noVer).valid).toBe(false)

    const noTables = JSON.stringify({ version: 1 })
    expect(validateBackupPayload(noTables).valid).toBe(false)
  })

  it('menerima payload yang valid dan menghitung summary baris', () => {
    const validJson = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      site: 'Masjid An-nuur Arwana',
      tables: {
        user: [{ id: '1' }, { id: '2' }],
        article: [{ id: 'a1' }],
      },
    })

    const result = validateBackupPayload(validJson)
    expect(result.valid).toBe(true)
    expect(result.summary?.user).toBe(2)
    expect(result.summary?.article).toBe(1)
  })
})
