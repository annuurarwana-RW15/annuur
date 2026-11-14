'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { uniqueProposalSlug } from '@/lib/proposal'
import type { ProposalStatus } from '@prisma/client'

export interface SaveProposalInput {
  id?: string
  title: string
  summary: string
  description: string
  coverImage?: string | null
  filePdf?: string | null
  filePdfSize?: string | null
  targetAmount: number
  collectedManual?: number
  categoryId?: string | null
  programId?: string | null
  startDate?: string | null
  endDate?: string | null
  status: ProposalStatus
  isFeatured?: boolean
  picName?: string | null
  picPhone?: string | null
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export async function saveProposal(input: SaveProposalInput): Promise<ActionResult> {
  await requireRole('ADMIN', 'KONTEN')

  const title = input.title?.trim()
  if (!title) return { ok: false, error: 'Judul proposal wajib diisi' }

  const summary = input.summary?.trim()
  if (!summary) return { ok: false, error: 'Ringkasan proposal wajib diisi' }

  const description = input.description?.trim()
  if (!description) return { ok: false, error: 'Deskripsi lengkap proposal wajib diisi' }

  const targetAmount = Number(input.targetAmount)
  if (isNaN(targetAmount) || targetAmount <= 0) {
    return { ok: false, error: 'Target anggaran (RAB) harus lebih besar dari 0' }
  }

  const collectedManual = Math.max(0, Number(input.collectedManual) || 0)
  const startDate = input.startDate ? new Date(input.startDate) : null
  const endDate = input.endDate ? new Date(input.endDate) : null

  try {
    if (input.id) {
      const existing = await db.proposal.findUnique({ where: { id: input.id } })
      if (!existing) return { ok: false, error: 'Proposal tidak ditemukan' }

      let slug = existing.slug
      if (existing.title !== title) {
        slug = await uniqueProposalSlug(title, input.id)
      }

      await db.proposal.update({
        where: { id: input.id },
        data: {
          title,
          slug,
          summary,
          description,
          coverImage: input.coverImage || null,
          filePdf: input.filePdf || null,
          filePdfSize: input.filePdfSize || null,
          targetAmount,
          collectedManual,
          categoryId: input.categoryId || null,
          programId: input.programId || null,
          startDate,
          endDate,
          status: input.status,
          isFeatured: Boolean(input.isFeatured),
          picName: input.picName?.trim() || null,
          picPhone: input.picPhone?.trim() || null,
        },
      })
    } else {
      const slug = await uniqueProposalSlug(title)
      await db.proposal.create({
        data: {
          title,
          slug,
          summary,
          description,
          coverImage: input.coverImage || null,
          filePdf: input.filePdf || null,
          filePdfSize: input.filePdfSize || null,
          targetAmount,
          collectedManual,
          categoryId: input.categoryId || null,
          programId: input.programId || null,
          startDate,
          endDate,
          status: input.status,
          isFeatured: Boolean(input.isFeatured),
          picName: input.picName?.trim() || null,
          picPhone: input.picPhone?.trim() || null,
        },
      })
    }

    revalidatePath('/proposal')
    revalidatePath('/admin/proposal')
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal menyimpan proposal' }
  }
}

export async function deleteProposalAction(id: string): Promise<ActionResult> {
  await requireRole('ADMIN', 'KONTEN')

  try {
    await db.proposal.delete({ where: { id } })

    revalidatePath('/proposal')
    revalidatePath('/admin/proposal')
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal menghapus proposal' }
  }
}
