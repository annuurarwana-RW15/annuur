import { z } from 'zod'
import { ARTICLE_STATUSES } from './status'

export const articleSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  slug: z.string().trim().default(''),
  excerpt: z.string().trim().default(''),
  coverImage: z.string().trim().default(''),
  body: z.string().trim().min(1, 'Isi artikel wajib diisi'),
  category: z.string().trim().default(''),
  status: z.enum(ARTICLE_STATUSES).default('DRAFT'),
  seoTitle: z.string().trim().default(''),
  seoDescription: z.string().trim().default(''),
  seoImage: z.string().trim().default(''),
})

/** Bentuk input `saveArticle` — field ber-default bersifat opsional. */
export type ArticleInput = z.input<typeof articleSchema>

/** Bentuk hasil parse (semua field non-`id` wajib terisi). */
export type ArticleData = z.output<typeof articleSchema>
