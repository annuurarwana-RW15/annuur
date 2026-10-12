'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export type PeriodResult = { ok: true } | { ok: false; error: string }

/** Terima Date atau string `YYYY-MM-DD` (nilai mentah dari input date form). */
const dateField = z
  .union([z.date(), z.string().trim().min(1, 'Tanggal wajib diisi')])
  .transform((value, ctx) => {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Tanggal tidak valid' })
      return z.NEVER
    }
    return date
  })

const openPeriodSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama periode wajib diisi')
      .max(20, 'Nama periode maksimal 20 karakter'),
    startDate: dateField,
    endDate: dateField,
  })
  .refine((data) => data.endDate.getTime() >= data.startDate.getTime(), {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['endDate'],
  })

/** Bentuk input `openPeriod`. */
export interface OpenPeriodInput {
  name: string
  startDate: Date | string
  endDate: Date | string
}

/** Halaman admin terkait periode & transaksi (transaksi selalu ke periode aktif). */
const KAS_PATHS = ['/admin/kas/periode', '/admin/kas/transaksi'] as const

function revalidateKas(): void {
  for (const path of KAS_PATHS) revalidatePath(path)
}

/** Prisma P2002 (unique `Period.name`) atau pesan driver "unique/duplicate". */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; message?: unknown }
  if (e.code === 'P2002') return true
  const message = typeof e.message === 'string' ? e.message : ''
  return /unique constraint|duplicate key/i.test(message)
}

/**
 * Buka periode baru (status AKTIF). Hanya satu periode AKTIF — bila masih ada,
 * kembalikan error eksplisit (keputusan binding: user menutup periode lama
 * secara sadar lewat dialog konfirmasi, bukan auto-close).
 */
export async function openPeriod(input: OpenPeriodInput): Promise<PeriodResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = openPeriodSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { name, startDate, endDate } = parsed.data

  const active = await db.period.findFirst({ where: { status: 'AKTIF' } })
  if (active) return { ok: false, error: 'Tutup periode aktif dulu' }

  try {
    await db.period.create({ data: { name, startDate, endDate, status: 'AKTIF' } })
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: 'Periode sudah ada' }
    throw err
  }

  revalidateKas()
  return { ok: true }
}

/**
 * Tutup periode: status DITUTUP + closedAt now + closedBy sesi. Boleh kapan pun
 * (setelah ditutup transaksi tertahan sampai periode baru dibuka — perilaku spec).
 */
export async function closePeriod(id: string): Promise<PeriodResult> {
  const user = await requireRole('ADMIN', 'BENDAHARA')

  const period = await db.period.findUnique({ where: { id } })
  if (!period) return { ok: false, error: 'Periode tidak ditemukan' }
  if (period.status === 'DITUTUP') {
    return { ok: false, error: 'Periode sudah ditutup' }
  }

  await db.period.update({
    where: { id },
    data: { status: 'DITUTUP', closedAt: new Date(), closedBy: user.id },
  })

  revalidateKas()
  return { ok: true }
}
