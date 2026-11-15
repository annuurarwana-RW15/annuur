import { db } from './db'

export interface DatabaseBackupPayload {
  version: number
  exportedAt: string
  site: string
  summary: Record<string, number>
  tables: {
    user: unknown[]
    period: unknown[]
    category: unknown[]
    setting: unknown[]
    section: unknown[]
    article: unknown[]
    donation: unknown[]
    transaction: unknown[]
    program: unknown[]
    proposal: unknown[]
    inventoryItem: unknown[]
    inventoryLoan: unknown[]
    inventoryLoanItem: unknown[]
    inventoryAcquisition: unknown[]
    track?: unknown[]
    pageView?: unknown[]
    prayerTimeCache?: unknown[]
  }
}

export async function createDatabaseBackup(): Promise<DatabaseBackupPayload> {
  const [
    user,
    period,
    category,
    setting,
    section,
    article,
    donation,
    transaction,
    program,
    proposal,
    inventoryItem,
    inventoryLoan,
    inventoryLoanItem,
    inventoryAcquisition,
    track,
    pageView,
    prayerTimeCache,
  ] = await Promise.all([
    db.user.findMany(),
    db.period.findMany(),
    db.category.findMany(),
    db.setting.findMany(),
    db.section.findMany(),
    db.article.findMany(),
    db.donation.findMany(),
    db.transaction.findMany(),
    db.program.findMany(),
    db.proposal.findMany(),
    db.inventoryItem.findMany(),
    db.inventoryLoan.findMany(),
    db.inventoryLoanItem.findMany(),
    db.inventoryAcquisition.findMany(),
    db.track.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }).catch(() => []),
    db.pageView.findMany({ take: 1000, orderBy: { viewedAt: 'desc' } }).catch(() => []),
    db.prayerTimeCache.findMany().catch(() => []),
  ])

  const summary = {
    user: user.length,
    period: period.length,
    category: category.length,
    setting: setting.length,
    section: section.length,
    article: article.length,
    donation: donation.length,
    transaction: transaction.length,
    program: program.length,
    proposal: proposal.length,
    inventoryItem: inventoryItem.length,
    inventoryLoan: inventoryLoan.length,
    inventoryLoanItem: inventoryLoanItem.length,
    inventoryAcquisition: inventoryAcquisition.length,
    track: track.length,
    pageView: pageView.length,
    prayerTimeCache: prayerTimeCache.length,
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    site: 'Masjid An-nuur Arwana',
    summary,
    tables: {
      user,
      period,
      category,
      setting,
      section,
      article,
      donation,
      transaction,
      program,
      proposal,
      inventoryItem,
      inventoryLoan,
      inventoryLoanItem,
      inventoryAcquisition,
      track,
      pageView,
      prayerTimeCache,
    },
  }
}
