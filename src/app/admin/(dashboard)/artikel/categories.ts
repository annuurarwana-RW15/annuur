import { db } from '@/lib/db'

/** Kategori unik dari artikel yang sudah ada — dipakai sebagai saran datalist form. */
export async function listArticleCategories(): Promise<string[]> {
  const rows = await db.article.findMany({
    where: { category: { not: null } },
    distinct: ['category'],
    orderBy: { category: 'asc' },
    select: { category: true },
  })
  return rows.flatMap((row) => (row.category ? [row.category] : []))
}
