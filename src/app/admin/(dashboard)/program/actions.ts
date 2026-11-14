'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { uniqueProgramSlug } from '@/lib/program'
import type {
  ProgramPeriodType,
  ProgramCategory,
  ProgramStatus,
} from '@prisma/client'

export interface SaveProgramInput {
  id?: string
  title: string
  description: string
  periodType: ProgramPeriodType
  category: ProgramCategory
  status: ProgramStatus
  progress: number
  targetDate?: string | null
  budgetEstimate?: number | null
  picName?: string | null
  picPhone?: string | null
  order?: number
  isFeatured?: boolean
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export async function saveProgram(input: SaveProgramInput): Promise<ActionResult> {
  await requireRole('ADMIN', 'KONTEN')

  const title = input.title?.trim()
  if (!title) return { ok: false, error: 'Judul program wajib diisi' }

  const description = input.description?.trim()
  if (!description) return { ok: false, error: 'Deskripsi program wajib diisi' }

  const clampedProgress = Math.max(0, Math.min(100, Math.round(input.progress || 0)))
  const targetDate = input.targetDate ? new Date(input.targetDate) : null
  const budgetEstimate = input.budgetEstimate ? input.budgetEstimate : null

  try {
    if (input.id) {
      const existing = await db.program.findUnique({ where: { id: input.id } })
      if (!existing) return { ok: false, error: 'Program tidak ditemukan' }

      let slug = existing.slug
      if (existing.title !== title) {
        slug = await uniqueProgramSlug(title, input.id)
      }

      await db.program.update({
        where: { id: input.id },
        data: {
          title,
          slug,
          description,
          periodType: input.periodType,
          category: input.category,
          status: input.status,
          progress: clampedProgress,
          targetDate,
          budgetEstimate,
          picName: input.picName?.trim() || null,
          picPhone: input.picPhone?.trim() || null,
          order: input.order ?? existing.order,
          isFeatured: Boolean(input.isFeatured),
        },
      })
    } else {
      const slug = await uniqueProgramSlug(title)
      await db.program.create({
        data: {
          title,
          slug,
          description,
          periodType: input.periodType,
          category: input.category,
          status: input.status,
          progress: clampedProgress,
          targetDate,
          budgetEstimate,
          picName: input.picName?.trim() || null,
          picPhone: input.picPhone?.trim() || null,
          order: input.order ?? 0,
          isFeatured: Boolean(input.isFeatured),
        },
      })
    }

    revalidatePath('/program')
    revalidatePath('/admin/program')
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal menyimpan program kerja' }
  }
}

export async function updateQuickProgress(
  id: string,
  progress: number,
): Promise<ActionResult> {
  await requireRole('ADMIN', 'KONTEN')

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))
  try {
    await db.program.update({
      where: { id },
      data: { progress: clampedProgress },
    })

    revalidatePath('/program')
    revalidatePath('/admin/program')
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal memperbarui progress' }
  }
}

export async function deleteProgramAction(id: string): Promise<ActionResult> {
  await requireRole('ADMIN', 'KONTEN')

  try {
    await db.program.delete({ where: { id } })

    revalidatePath('/program')
    revalidatePath('/admin/program')
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal menghapus program' }
  }
}
