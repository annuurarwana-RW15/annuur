'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { galleryItems } from '@/components/public/content'
import { buildContent, readField } from '../sections/section-content'

export interface GaleriResult {
  ok: boolean
  error?: string
}

export interface SaveGaleriInput {
  /** Index baris pada array `images`; null/undefined = tambah baru. */
  index?: number | null
  url: string
  caption?: string
}

const URL_RE = /^(https?:\/\/|\/)/
const MAX_CAPTION = 120

/**
 * Baca daftar foto section galeri (menerima bentuk seed `string[]` dan editor
 * `{url,caption}[]` — lihat section-content).
 */
async function loadImages(): Promise<{
  sectionId: string
  title: string
  content: unknown
  images: { url: string; caption: string }[]
} | null> {
  const section = await db.section.findFirst({ where: { key: 'galeri' } })
  if (!section) return null
  return {
    sectionId: section.id,
    title: section.title,
    content: section.content,
    images: galleryItems(readField(section.content, 'galeri', 'images')),
  }
}

async function persist(
  sectionId: string,
  title: string,
  content: unknown,
  images: { url: string; caption: string }[],
): Promise<void> {
  const next = buildContent('galeri', content, title, { images })
  await db.section.update({
    where: { id: sectionId },
    data: { content: next as Prisma.InputJsonValue },
  })
  revalidatePath('/galeri')
  revalidatePath('/')
  revalidatePath('/admin/galeri')
}

export async function saveGaleriItem(input: SaveGaleriInput): Promise<GaleriResult> {
  await requireRole('ADMIN', 'KONTEN')

  const url = typeof input?.url === 'string' ? input.url.trim() : ''
  const caption = typeof input?.caption === 'string' ? input.caption.trim() : ''
  if (!url) return { ok: false, error: 'URL wajib diisi' }
  if (!URL_RE.test(url)) {
    return { ok: false, error: 'URL tidak valid — awali http(s):// atau path /…' }
  }
  if (caption.length > MAX_CAPTION) {
    return { ok: false, error: `Keterangan maksimal ${MAX_CAPTION} karakter` }
  }

  const loaded = await loadImages()
  if (!loaded) return { ok: false, error: 'Section galeri tidak ditemukan' }

  const index = input?.index
  if (index === undefined || index === null) {
    loaded.images.push({ url, caption })
  } else {
    if (!Number.isInteger(index) || index < 0 || index >= loaded.images.length) {
      return { ok: false, error: 'Foto tidak ditemukan' }
    }
    loaded.images[index] = { url, caption }
  }

  await persist(loaded.sectionId, loaded.title, loaded.content, loaded.images)
  return { ok: true }
}

export async function deleteGaleriItem(index: number): Promise<GaleriResult> {
  await requireRole('ADMIN', 'KONTEN')

  if (!Number.isInteger(index) || index < 0) {
    return { ok: false, error: 'Foto tidak ditemukan' }
  }

  const loaded = await loadImages()
  if (!loaded) return { ok: false, error: 'Section galeri tidak ditemukan' }
  if (index >= loaded.images.length) {
    return { ok: false, error: 'Foto tidak ditemukan' }
  }

  loaded.images.splice(index, 1)
  await persist(loaded.sectionId, loaded.title, loaded.content, loaded.images)
  return { ok: true }
}
