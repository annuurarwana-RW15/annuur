'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export type VerifyResult = { ok: true } | { ok: false; error: string }

/** Halaman yang menampilkan data donasi/kas setelah verifikasi berubah. */
const VERIFY_PATHS = [
  '/admin/donasi',
  '/admin',
  '/admin/kas/transaksi',
  '/laporan-kas',
  '/',
] as const

const rejectNoteSchema = z
  .string()
  .trim()
  .min(2, 'Catatan penolakan minimal 2 karakter')
  .max(300, 'Catatan penolakan maksimal 300 karakter')

/** Error domain: pesan diteruskan ke caller sebagai {ok:false,error}. */
class VerifyError extends Error {}

/**
 * Verifikasi donasi masuk: confirm membuat Transaksi MASUK (dalam $transaction)
 * & menandai DIKONFIRMASI; reject menandai DITOLAK + rejectNote.
 * Idempoten: hanya donasi MENUNGGU yang bisa diproses — donasi yang sudah
 * diverifikasi tidak boleh menghasilkan transaksi kas ganda.
 * `Transaction.date` memakai waktu verifikasi (bukan waktu donasi masuk).
 */
export async function verifyDonation(
  id: string,
  decision: 'confirm' | 'reject',
  note?: string,
): Promise<VerifyResult> {
  const user = await requireRole('ADMIN', 'BENDAHARA')

  const donation = await db.donation.findUnique({ where: { id } })
  if (!donation) return { ok: false, error: 'Donasi tidak ditemukan' }
  if (donation.status !== 'MENUNGGU') {
    return { ok: false, error: 'Sudah diproses' }
  }

  try {
    if (decision === 'reject') {
      const parsed = rejectNoteSchema.safeParse(note)
      if (!parsed.success) {
        return { ok: false, error: 'Catatan penolakan wajib diisi' }
      }
      // Claim atomik: hanya donasi MENUNGGU yang boleh berubah — menangkal
      // race reject vs confirm bersamaan (DITOLAK + transaksi MASUK ganda).
      const claimed = await db.donation.updateMany({
        where: { id, status: 'MENUNGGU' },
        data: {
          status: 'DITOLAK',
          rejectNote: parsed.data,
          verifiedById: user.id,
          verifiedAt: new Date(),
        },
      })
      if (claimed.count === 0) return { ok: false, error: 'Sudah diproses' }
    } else {
      await db.$transaction(async (tx) => {
        const period = await tx.period.findFirst({
          where: { status: 'AKTIF' },
          orderBy: { startDate: 'desc' },
        })
        if (!period) throw new VerifyError('Tidak ada periode aktif')

        // Kategori donasi bila valid (MASUK & aktif), fallback kategori MASUK aktif.
        let categoryId: string | null = null
        if (donation.categoryId) {
          const category = await tx.category.findUnique({
            where: { id: donation.categoryId },
          })
          if (category && category.type === 'MASUK' && category.isActive) {
            categoryId = category.id
          }
        }
        if (!categoryId) {
          const fallback = await tx.category.findFirst({
            where: { type: 'MASUK', isActive: true },
            orderBy: { name: 'asc' },
          })
          if (!fallback) throw new VerifyError('Kategori tidak ditemukan')
          categoryId = fallback.id
        }

        const now = new Date()
        // Claim atomik di dalam transaksi: jika donasi sudah diproses proses
        // lain, transaksi ini batal (rollback) dan tidak ada transaksi kas ganda.
        const claimed = await tx.donation.updateMany({
          where: { id: donation.id, status: 'MENUNGGU' },
          data: {
            status: 'DIKONFIRMASI',
            verifiedById: user.id,
            verifiedAt: now,
          },
        })
        if (claimed.count === 0) throw new VerifyError('Sudah diproses')

        await tx.transaction.create({
          data: {
            type: 'MASUK',
            amount: donation.amount,
            date: now,
            description: `Donasi ${donation.donorName} (${donation.reference})`,
            categoryId,
            periodId: period.id,
            donationId: donation.id,
            createdBy: user.id,
          },
        })
      })
    }
  } catch (err) {
    if (err instanceof VerifyError) return { ok: false, error: err.message }
    console.error(
      '[donasi] verifyDonation:',
      err instanceof Error ? err.message : err,
    )
    return { ok: false, error: 'Gagal memproses' }
  }

  for (const path of VERIFY_PATHS) revalidatePath(path)
  return { ok: true }
}
