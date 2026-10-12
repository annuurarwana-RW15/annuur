import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClientIp, hit } from '@/lib/rate-limit'

/** Slug hasil `slugify`: huruf kecil ASCII dan angka dipisah satu dash. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Payload endpoint ini hanya `{ slug }` — di atas 1KB jelas bukan payload sah. */
const MAX_BODY_BYTES = 1024
const VIEW_LIMIT = 30
const VIEW_WINDOW_MS = 60_000

/**
 * POST /api/articles/view { slug } → tambah viewCount artikel PUBLISHED.
 * Dipanggil sekali per kunjungan dari `ViewCounter` (bukan dari render ISR,
 * supaya hitungan tidak menggandakan diri tiap revalidasi).
 * Throttle in-memory 30/menit per IP+slug; lewat kuota → 204 diam-diam
 * tanpa increment agar client tetap tenang.
 */
export async function POST(req: Request) {
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body terlalu besar' }, { status: 400 })
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body terlalu besar' }, { status: 400 })
  }

  let slug: unknown
  try {
    slug = (JSON.parse(raw) as { slug?: unknown } | null)?.slug
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  if (typeof slug !== 'string' || slug.length > 200 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 })
  }

  if (
    !hit(
      `articles:view:${getClientIp(req)}:${slug}`,
      VIEW_LIMIT,
      VIEW_WINDOW_MS,
    )
  ) {
    return new NextResponse(null, { status: 204 })
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
