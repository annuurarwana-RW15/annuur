import { db } from './db'
import type { DatabaseBackupPayload } from './database-backup'

export interface ValidationResult {
  valid: boolean
  error?: string
  summary?: Record<string, number>
  payload?: DatabaseBackupPayload
}

export function validateBackupPayload(rawJson: string): ValidationResult {
  if (!rawJson || typeof rawJson !== 'string') {
    return { valid: false, error: 'Berkas cadangan kosong atau tidak valid' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { valid: false, error: 'Format berkas bukan JSON yang valid' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Struktur data cadangan tidak dikenali' }
  }

  const data = parsed as Partial<DatabaseBackupPayload>
  if (!data.version || typeof data.version !== 'number') {
    return { valid: false, error: 'Versi skema cadangan tidak ditemukan' }
  }

  if (!data.tables || typeof data.tables !== 'object') {
    return { valid: false, error: 'Kumpulan tabel data tidak ditemukan dalam berkas cadangan' }
  }

  const tables = data.tables
  const summary: Record<string, number> = {}

  for (const [key, rows] of Object.entries(tables)) {
    if (Array.isArray(rows)) {
      summary[key] = rows.length
    }
  }

  return {
    valid: true,
    summary,
    payload: data as DatabaseBackupPayload,
  }
}

export async function executeDatabaseRestore(
  payload: DatabaseBackupPayload,
): Promise<{ ok: boolean; error?: string; restoredCounts?: Record<string, number> }> {
  const { tables } = payload
  if (!tables || typeof tables !== 'object') {
    return { ok: false, error: 'Data tabel tidak valid' }
  }

  try {
    await db.$transaction(
      async (tx) => {
        // 1. Hapus data anak terlebih dahulu untuk menjaga foreign key constraints
        await tx.inventoryLoanItem.deleteMany().catch(() => {})
        await tx.inventoryLoan.deleteMany().catch(() => {})
        await tx.inventoryAcquisition.deleteMany().catch(() => {})
        await tx.inventoryItem.deleteMany().catch(() => {})
        await tx.transaction.deleteMany().catch(() => {})
        await tx.donation.deleteMany().catch(() => {})
        await tx.proposal.deleteMany().catch(() => {})
        await tx.program.deleteMany().catch(() => {})
        await tx.article.deleteMany().catch(() => {})
        await tx.section.deleteMany().catch(() => {})
        await tx.setting.deleteMany().catch(() => {})
        await tx.category.deleteMany().catch(() => {})
        await tx.period.deleteMany().catch(() => {})
        await tx.user.deleteMany().catch(() => {})
        await tx.track.deleteMany().catch(() => {})
        await tx.pageView.deleteMany().catch(() => {})
        await tx.prayerTimeCache.deleteMany().catch(() => {})

        // 2. Insert kembali dari induk ke anak
        if (Array.isArray(tables.user) && tables.user.length > 0) {
          for (const row of tables.user) {
            const u = row as Record<string, unknown>
            await tx.user.create({
              data: {
                id: String(u.id),
                name: String(u.name || ''),
                email: String(u.email || ''),
                passwordHash: String(u.passwordHash || ''),
                role: u.role as 'ADMIN' | 'BENDAHARA' | 'KONTEN' | 'VIEWER',
                isActive: Boolean(u.isActive ?? true),
                createdAt: u.createdAt ? new Date(String(u.createdAt)) : undefined,
                updatedAt: u.updatedAt ? new Date(String(u.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.period) && tables.period.length > 0) {
          for (const row of tables.period) {
            const p = row as Record<string, unknown>
            await tx.period.create({
              data: {
                id: String(p.id),
                name: String(p.name),
                startDate: new Date(String(p.startDate)),
                endDate: new Date(String(p.endDate)),
                status: p.status as 'AKTIF' | 'DITUTUP',
                closedAt: p.closedAt ? new Date(String(p.closedAt)) : null,
                closedBy: p.closedBy ? String(p.closedBy) : null,
              },
            })
          }
        }

        if (Array.isArray(tables.category) && tables.category.length > 0) {
          for (const row of tables.category) {
            const c = row as Record<string, unknown>
            await tx.category.create({
              data: {
                id: String(c.id),
                name: String(c.name),
                type: c.type as 'MASUK' | 'KELUAR',
                color: c.color ? String(c.color) : null,
                isActive: Boolean(c.isActive ?? true),
              },
            })
          }
        }

        if (Array.isArray(tables.setting) && tables.setting.length > 0) {
          for (const row of tables.setting) {
            const s = row as Record<string, unknown>
            await tx.setting.create({
              data: {
                key: String(s.key),
                value: s.value as never,
              },
            })
          }
        }

        if (Array.isArray(tables.section) && tables.section.length > 0) {
          for (const row of tables.section) {
            const sec = row as Record<string, unknown>
            await tx.section.create({
              data: {
                id: String(sec.id),
                key: String(sec.key),
                title: String(sec.title),
                content: sec.content as never,
                isVisible: Boolean(sec.isVisible ?? true),
                order: Number(sec.order ?? 0),
                updatedAt: sec.updatedAt ? new Date(String(sec.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.article) && tables.article.length > 0) {
          for (const row of tables.article) {
            const a = row as Record<string, unknown>
            await tx.article.create({
              data: {
                id: String(a.id),
                title: String(a.title),
                slug: String(a.slug),
                excerpt: a.excerpt ? String(a.excerpt) : null,
                coverImage: a.coverImage ? String(a.coverImage) : null,
                body: String(a.body || ''),
                category: a.category ? String(a.category) : null,
                status: a.status as 'DRAFT' | 'PUBLISHED',
                seoTitle: a.seoTitle ? String(a.seoTitle) : null,
                seoDescription: a.seoDescription ? String(a.seoDescription) : null,
                seoImage: a.seoImage ? String(a.seoImage) : null,
                viewCount: Number(a.viewCount ?? 0),
                authorId: String(a.authorId),
                publishedAt: a.publishedAt ? new Date(String(a.publishedAt)) : null,
                createdAt: a.createdAt ? new Date(String(a.createdAt)) : undefined,
                updatedAt: a.updatedAt ? new Date(String(a.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.donation) && tables.donation.length > 0) {
          for (const row of tables.donation) {
            const d = row as Record<string, unknown>
            await tx.donation.create({
              data: {
                id: String(d.id),
                donorName: String(d.donorName || ''),
                amount: String(d.amount),
                categoryId: d.categoryId ? String(d.categoryId) : null,
                message: d.message ? String(d.message) : null,
                proofImage: d.proofImage ? String(d.proofImage) : null,
                reference: String(d.reference),
                status: d.status as 'MENUNGGU' | 'DIKONFIRMASI' | 'DITOLAK',
                rejectNote: d.rejectNote ? String(d.rejectNote) : null,
                verifiedById: d.verifiedById ? String(d.verifiedById) : null,
                verifiedAt: d.verifiedAt ? new Date(String(d.verifiedAt)) : null,
                createdAt: d.createdAt ? new Date(String(d.createdAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.program) && tables.program.length > 0) {
          for (const row of tables.program) {
            const pr = row as Record<string, unknown>
            await tx.program.create({
              data: {
                id: String(pr.id),
                title: String(pr.title),
                slug: String(pr.slug),
                description: String(pr.description || ''),
                periodType: pr.periodType as 'PENDEK' | 'PANJANG',
                category: pr.category as 'IDARAH' | 'IMARAH' | 'RIAYAH' | 'SOSIAL',
                status: pr.status as 'DIRENCANAKAN' | 'BERJALAN' | 'SELESAI' | 'DITUNDA',
                progress: Number(pr.progress ?? 0),
                targetDate: pr.targetDate ? new Date(String(pr.targetDate)) : null,
                budgetEstimate: pr.budgetEstimate ? String(pr.budgetEstimate) : null,
                picName: pr.picName ? String(pr.picName) : null,
                picPhone: pr.picPhone ? String(pr.picPhone) : null,
                order: Number(pr.order ?? 0),
                isFeatured: Boolean(pr.isFeatured ?? false),
                createdAt: pr.createdAt ? new Date(String(pr.createdAt)) : undefined,
                updatedAt: pr.updatedAt ? new Date(String(pr.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.proposal) && tables.proposal.length > 0) {
          for (const row of tables.proposal) {
            const prop = row as Record<string, unknown>
            await tx.proposal.create({
              data: {
                id: String(prop.id),
                title: String(prop.title),
                slug: String(prop.slug),
                summary: String(prop.summary || ''),
                description: String(prop.description || ''),
                coverImage: prop.coverImage ? String(prop.coverImage) : null,
                filePdf: prop.filePdf ? String(prop.filePdf) : null,
                filePdfSize: prop.filePdfSize ? String(prop.filePdfSize) : null,
                targetAmount: String(prop.targetAmount),
                collectedManual: String(prop.collectedManual ?? '0'),
                categoryId: prop.categoryId ? String(prop.categoryId) : null,
                programId: prop.programId ? String(prop.programId) : null,
                startDate: prop.startDate ? new Date(String(prop.startDate)) : null,
                endDate: prop.endDate ? new Date(String(prop.endDate)) : null,
                status: prop.status as 'DRAFT' | 'DIBUKA' | 'TERPENUHI' | 'SELESAI',
                isFeatured: Boolean(prop.isFeatured ?? false),
                picName: prop.picName ? String(prop.picName) : null,
                picPhone: prop.picPhone ? String(prop.picPhone) : null,
                createdAt: prop.createdAt ? new Date(String(prop.createdAt)) : undefined,
                updatedAt: prop.updatedAt ? new Date(String(prop.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.transaction) && tables.transaction.length > 0) {
          for (const row of tables.transaction) {
            const t = row as Record<string, unknown>
            await tx.transaction.create({
              data: {
                id: String(t.id),
                type: t.type as 'MASUK' | 'KELUAR',
                amount: String(t.amount),
                date: new Date(String(t.date)),
                description: String(t.description || ''),
                categoryId: String(t.categoryId),
                periodId: String(t.periodId),
                receiptImage: t.receiptImage ? String(t.receiptImage) : null,
                createdBy: String(t.createdBy),
                donationId: t.donationId ? String(t.donationId) : null,
                createdAt: t.createdAt ? new Date(String(t.createdAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.inventoryItem) && tables.inventoryItem.length > 0) {
          for (const row of tables.inventoryItem) {
            const itm = row as Record<string, unknown>
            await tx.inventoryItem.create({
              data: {
                id: String(itm.id),
                code: String(itm.code),
                name: String(itm.name),
                category: itm.category as 'SARPRAS_UMUM' | 'ELEKTRONIK_AUDIO' | 'IBADAH_PENGAJIAN' | 'RUKUN_KEMATIAN' | 'KEBERSIHAN_DAPUR',
                location: String(itm.location || ''),
                isBorrowable: Boolean(itm.isBorrowable ?? true),
                totalQty: Number(itm.totalQty ?? 1),
                availableQty: Number(itm.availableQty ?? 1),
                borrowedQty: Number(itm.borrowedQty ?? 0),
                brokenQty: Number(itm.brokenQty ?? 0),
                isWaqf: Boolean(itm.isWaqf ?? false),
                waqfDonor: itm.waqfDonor ? String(itm.waqfDonor) : null,
                priceEstimate: itm.priceEstimate ? String(itm.priceEstimate) : null,
                notes: itm.notes ? String(itm.notes) : null,
                image: itm.image ? String(itm.image) : null,
                createdAt: itm.createdAt ? new Date(String(itm.createdAt)) : undefined,
                updatedAt: itm.updatedAt ? new Date(String(itm.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.inventoryLoan) && tables.inventoryLoan.length > 0) {
          for (const row of tables.inventoryLoan) {
            const l = row as Record<string, unknown>
            await tx.inventoryLoan.create({
              data: {
                id: String(l.id),
                code: String(l.code),
                borrowerName: String(l.borrowerName || ''),
                borrowerPhone: String(l.borrowerPhone || ''),
                borrowerAddress: l.borrowerAddress ? String(l.borrowerAddress) : null,
                purpose: String(l.purpose || ''),
                loanDate: new Date(String(l.loanDate)),
                expectedReturn: new Date(String(l.expectedReturn)),
                actualReturn: l.actualReturn ? new Date(String(l.actualReturn)) : null,
                status: l.status as 'DIPINJAM' | 'KEMBALI_SEBAGIAN' | 'SELESAI' | 'TERLAMBAT',
                officerOut: String(l.officerOut || ''),
                officerIn: l.officerIn ? String(l.officerIn) : null,
                notes: l.notes ? String(l.notes) : null,
                createdAt: l.createdAt ? new Date(String(l.createdAt)) : undefined,
                updatedAt: l.updatedAt ? new Date(String(l.updatedAt)) : undefined,
              },
            })
          }
        }

        if (Array.isArray(tables.inventoryLoanItem) && tables.inventoryLoanItem.length > 0) {
          for (const row of tables.inventoryLoanItem) {
            const li = row as Record<string, unknown>
            await tx.inventoryLoanItem.create({
              data: {
                id: String(li.id),
                loanId: String(li.loanId),
                itemId: String(li.itemId),
                borrowedQty: Number(li.borrowedQty ?? 1),
                returnedQty: Number(li.returnedQty ?? 0),
                brokenQty: Number(li.brokenQty ?? 0),
                missingQty: Number(li.missingQty ?? 0),
              },
            })
          }
        }

        if (Array.isArray(tables.inventoryAcquisition) && tables.inventoryAcquisition.length > 0) {
          for (const row of tables.inventoryAcquisition) {
            const acq = row as Record<string, unknown>
            await tx.inventoryAcquisition.create({
              data: {
                id: String(acq.id),
                itemId: String(acq.itemId),
                quantity: Number(acq.quantity ?? 1),
                source: String(acq.source || ''),
                unitPrice: acq.unitPrice ? String(acq.unitPrice) : null,
                donorName: acq.donorName ? String(acq.donorName) : null,
                officer: String(acq.officer || ''),
                date: new Date(String(acq.date)),
                notes: acq.notes ? String(acq.notes) : null,
                transactionId: acq.transactionId ? String(acq.transactionId) : null,
              },
            })
          }
        }
      },
      { timeout: 60000 },
    )

    const restoredCounts: Record<string, number> = {}
    for (const [k, v] of Object.entries(tables)) {
      if (Array.isArray(v)) restoredCounts[k] = v.length
    }

    return { ok: true, restoredCounts }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat proses pemulihan basis data',
    }
  }
}
