import { db } from '@/lib/db'
import { slugify } from './slugify'

export { slugify }

/**
 * Cari slug unik untuk `base`. Bila sudah dipakai artikel lain, tambahkan
 * `-2`, `-3`, … sampai bebas. `excludeId` mengecualikan artikel yang sedang
 * diedit sehingga slug miliknya sendiri tidak dianggap bentrok.
 */
export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const normalized = slugify(base)
  if (!normalized) return normalized

  let candidate = normalized
  let counter = 2
  for (;;) {
    const clash = await db.article.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${normalized}-${counter}`
    counter += 1
  }
}
