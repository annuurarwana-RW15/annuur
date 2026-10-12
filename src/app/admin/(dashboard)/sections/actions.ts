'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export interface SectionResult {
  ok: boolean
  error?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function updateSection(
  id: string,
  title: string,
  content: unknown,
): Promise<SectionResult> {
  await requireRole('ADMIN', 'KONTEN')

  const trimmed = typeof title === 'string' ? title.trim() : ''
  if (!trimmed) return { ok: false, error: 'Judul wajib diisi' }
  if (!isPlainObject(content)) return { ok: false, error: 'Konten harus berupa objek' }

  const existing = await db.section.findUnique({ where: { id } })
  if (!existing) return { ok: false, error: 'Section tidak ditemukan' }

  await db.section.update({
    where: { id },
    data: { title: trimmed, content: content as Prisma.InputJsonValue },
  })
  revalidatePath('/')
  return { ok: true }
}

export async function toggleSection(id: string, visible: boolean): Promise<void> {
  await requireRole('ADMIN', 'KONTEN')

  const existing = await db.section.findUnique({ where: { id } })
  if (!existing) throw new Error('Section tidak ditemukan')

  await db.section.update({ where: { id }, data: { isVisible: Boolean(visible) } })
  revalidatePath('/')
}

export async function reorderSections(orderedIds: string[]): Promise<SectionResult> {
  await requireRole('ADMIN', 'KONTEN')

  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    !orderedIds.every((value) => typeof value === 'string')
  ) {
    return { ok: false, error: 'Daftar urutan tidak valid' }
  }

  const sections = await db.section.findMany({ select: { id: true } })
  const existingIds = sections.map((section) => section.id)
  const unique = new Set(orderedIds)
  const setMatches =
    unique.size === orderedIds.length &&
    unique.size === existingIds.length &&
    existingIds.every((id) => unique.has(id))
  if (!setMatches) {
    return { ok: false, error: 'Daftar id tidak sesuai dengan section yang ada' }
  }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.section.update({ where: { id }, data: { order: index } }),
    ),
  )
  revalidatePath('/')
  return { ok: true }
}
