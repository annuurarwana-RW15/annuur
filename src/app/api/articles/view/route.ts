import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Slug hasil `slugify`: huruf kecil ASCII dan angka dipisah satu dash. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * POST /api/articles/view { slug } → tambah viewCount artikel PUBLISHED.
 * Dipanggil sekali per kunjungan dari `ViewCounter` (bukan dari render ISR,
 * supaya hitungan tidak menggandakan diri tiap revalidasi).
 */
export async function POST(req: Request) {
  let slug: unknown
  try {
    const body: unknown = await req.json()
    slug = (body as { slug?: unknown } | null)?.slug
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  if (typeof slug !== 'string' || slug.length > 200 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 })
  }

  try {
    const article = await db.article.findUnique({
      where: { slug },
      select: { status: true },
    })
    if (!article || article.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Artikel tidak ditemukan' },
        { status: 404 },
      )
    }

    await db.article.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { error: 'Gagal menyimpan kunjungan' },
      { status: 500 },
    )
  }
}
