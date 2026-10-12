'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { slugify, uniqueSlug } from '@/lib/slug'
import { articleSchema, type ArticleInput } from './schema'

export type ArticleSaveResult =
  | { ok: true; slug: string }
  | { ok: false; error: string }

/** Halaman publik yang membaca artikel. `/berita` menyusul (Task 12). */
const PUBLIC_PATHS = ['/berita', '/', '/kegiatan'] as const

function revalidatePublicPages(): void {
  for (const path of PUBLIC_PATHS) revalidatePath(path)
}

export async function saveArticle(input: ArticleInput): Promise<ArticleSaveResult> {
  const user = await requireRole('ADMIN', 'KONTEN')

  const parsed = articleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }
  const data = parsed.data

  const base = slugify(data.slug || data.title)
  if (!base) {
    return { ok: false, error: 'Slug tidak valid — harus mengandung huruf atau angka' }
  }
  const slug = await uniqueSlug(base, data.id)

  const fields = {
    title: data.title,
    slug,
    excerpt: data.excerpt || null,
    coverImage: data.coverImage || null,
    body: data.body,
    category: data.category || null,
    status: data.status,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    seoImage: data.seoImage || null,
  }

  if (data.id) {
    const existing = await db.article.findUnique({ where: { id: data.id } })
    if (!existing) return { ok: false, error: 'Artikel tidak ditemukan' }

    await db.article.update({
      where: { id: data.id },
      data: {
        ...fields,
        publishedAt:
          data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null,
      },
    })
    // Terbit maupun kembali jadi draf mengubah daftar publik.
    if (data.status === 'PUBLISHED' || existing.status === 'PUBLISHED') {
      revalidatePublicPages()
    }
  } else {
    await db.article.create({
      data: {
        ...fields,
        authorId: user.id,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    })
    if (data.status === 'PUBLISHED') revalidatePublicPages()
  }

  return { ok: true, slug }
}

export async function deleteArticle(id: string): Promise<void> {
  await requireRole('ADMIN', 'KONTEN')

  const existing = await db.article.findUnique({ where: { id } })
  if (!existing) throw new Error('Artikel tidak ditemukan')

  await db.article.delete({ where: { id } })
  if (existing.status === 'PUBLISHED') revalidatePublicPages()
}

export async function publishArticle(id: string, publish: boolean): Promise<void> {
  await requireRole('ADMIN', 'KONTEN')

  const existing = await db.article.findUnique({ where: { id } })
  if (!existing) throw new Error('Artikel tidak ditemukan')

  await db.article.update({
    where: { id },
    data: {
      status: publish ? 'PUBLISHED' : 'DRAFT',
      publishedAt: publish ? existing.publishedAt ?? new Date() : null,
    },
  })
  revalidatePublicPages()
}
