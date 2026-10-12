'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export type CategoryResult = { ok: true } | { ok: false; error: string }

// Tidak di-export: modul 'use server' hanya boleh mengekspor fungsi async.
const categorySchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi')
    .max(60, 'Nama kategori maksimal 60 karakter'),
  type: z.enum(['MASUK', 'KELUAR'], { error: 'Jenis harus MASUK atau KELUAR' }),
  color: z
    .union([
      z.literal(''),
      z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus berupa hex #RRGGBB'),
    ])
    .optional(),
  isActive: z.boolean(),
})

/** Bentuk input `saveCategory` (field ber-default bersifat opsional). */
export type CategoryInput = z.input<typeof categorySchema>

/** Halaman admin yang menampilkan nama/jenis kategori. */
const KAS_PATHS = ['/admin/kas/kategori', '/admin/kas/transaksi'] as const

function revalidateKas(): void {
  for (const path of KAS_PATHS) revalidatePath(path)
}

/**
 * Prisma P2003/P2004, SQLSTATE 23503 (driver adapter), atau pesan driver
 * "violates foreign key constraint … RESTRICT" — kategori masih dipakai transaksi.
 */
function isReferencedByTransactions(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; meta?: unknown; message?: unknown }
  if (e.code === 'P2003' || e.code === 'P2004') return true
  if (typeof e.meta === 'object' && e.meta !== null) {
    if ((e.meta as { code?: unknown }).code === '23503') return true
  }
  const message = typeof e.message === 'string' ? e.message : ''
  return /foreign key constraint|23503|\bRESTRICT\b/i.test(message)
}

export async function saveCategory(input: CategoryInput): Promise<CategoryResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const { id, name, type, color, isActive } = parsed.data
  const data = { name, type, color: color || null, isActive }

  if (id) {
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) return { ok: false, error: 'Kategori tidak ditemukan' }
    await db.category.update({ where: { id }, data })
  } else {
    await db.category.create({ data })
  }

  revalidateKas()
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<CategoryResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) return { ok: false, error: 'Kategori tidak ditemukan' }

  try {
    await db.category.delete({ where: { id } })
  } catch (err) {
    if (isReferencedByTransactions(err)) {
      return { ok: false, error: 'Kategori masih dipakai transaksi' }
    }
    throw err
  }

  revalidateKas()
  return { ok: true }
}
