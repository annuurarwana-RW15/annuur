'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getActivePeriod } from '@/lib/kas'
import { requireRole } from '@/lib/rbac'
import { txSchema, type TxInput } from './schema'

export type TxResult = { ok: true } | { ok: false; error: string }

const TX_PATHS = ['/admin/kas/transaksi', '/admin', '/laporan-kas', '/'] as const

function revalidateTx(): void {
  for (const path of TX_PATHS) revalidatePath(path)
}

/** Periode tempat transaksi hidup — DITUTUP memblokir semua mutasi. */
async function getTransactionPeriodStatus(
  id: string,
): Promise<{ found: false } | { found: true; status: 'AKTIF' | 'DITUTUP' }> {
  const existing = await db.transaction.findUnique({
    where: { id },
    select: { id: true, period: { select: { status: true } } },
  })
  if (!existing) return { found: false }
  return { found: true, status: existing.period.status }
}

export async function createTransaction(input: TxInput): Promise<TxResult> {
  const user = await requireRole('ADMIN', 'BENDAHARA')

  const parsed = txSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { type, amount, date, description, categoryId, receiptImage } = parsed.data

  const period = await getActivePeriod()
  if (!period) {
    // Bedakan "periode sudah ditutup" (mutasi diblokir) vs "belum ada periode".
    const closed = await db.period.findFirst({
      where: { status: 'DITUTUP' },
      orderBy: { endDate: 'desc' },
      select: { id: true },
    })
    return {
      ok: false,
      error: closed ? 'Periode sudah ditutup' : 'Tidak ada periode aktif',
    }
  }

  await db.transaction.create({
    data: {
      type,
      amount,
      date,
      description,
      categoryId,
      periodId: period.id,
      createdBy: user.id,
      receiptImage: receiptImage || null,
    },
  })

  revalidateTx()
  return { ok: true }
}

export async function updateTransaction(id: string, input: TxInput): Promise<TxResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = txSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { type, amount, date, description, categoryId, receiptImage } = parsed.data

  const existing = await getTransactionPeriodStatus(id)
  if (!existing.found) return { ok: false, error: 'Transaksi tidak ditemukan' }
  if (existing.status === 'DITUTUP') {
    return { ok: false, error: 'Periode sudah ditutup' }
  }

  await db.transaction.update({
    where: { id },
    data: {
      type,
      amount,
      date,
      description,
      categoryId,
      receiptImage: receiptImage || null,
    },
  })

  revalidateTx()
  return { ok: true }
}

export async function deleteTransaction(id: string): Promise<TxResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const existing = await getTransactionPeriodStatus(id)
  if (!existing.found) return { ok: false, error: 'Transaksi tidak ditemukan' }
  if (existing.status === 'DITUTUP') {
    return { ok: false, error: 'Periode sudah ditutup' }
  }

  await db.transaction.delete({ where: { id } })

  revalidateTx()
  return { ok: true }
}
