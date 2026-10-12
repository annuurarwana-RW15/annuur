import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hit } from '@/lib/rate-limit'
import { donationSchema } from '@/app/(public)/donasi/schema'

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000
/** Percobaan generate `reference` bila bentrok unique (sangat jarang). */
const MAX_ATTEMPTS = 3

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || 'unknown'
}

/** `DON-` + 8 karakter base36 uppercase (A–Z, 0–9) — unik via constraint DB. */
function generateReference(): string {
  let chars = ''
  while (chars.length < 8) {
    chars += Math.random().toString(36).slice(2).toUpperCase()
  }
  return `DON-${chars.slice(0, 8)}`
}

/** Prisma P2002/P2004 atau driver adapter menandai pelanggaran unique. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; meta?: unknown }
  if (e.code === 'P2002' || e.code === 'P2004') return true
  if (typeof e.meta === 'object' && e.meta !== null) {
    const target = (e.meta as { target?: unknown }).target
    if (target === 'reference') return true
    if (Array.isArray(target) && target.includes('reference')) return true
  }
  return false
}

function dbError(label: string, err: unknown): NextResponse {
  console.error(`[donasi] ${label}:`, err instanceof Error ? err.message : err)
  return NextResponse.json(
    { ok: false, error: 'Gagal menyimpan donasi' },
    { status: 500 },
  )
}

/**
 * POST /api/donasi — donasi publik tanpa akun.
 * Body: `{donorName, amount, categoryId?, message?, proofImage?}` (zod).
 * Rate-limit in-memory 5/menit per IP; selalu tersimpan dengan status
 * MENUNGGU — verifikasi (→ Transaksi) ditangani admin di Task 17.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Body tidak valid' },
      { status: 400 },
    )
  }

  if (!hit(`donasi:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak permintaan, coba lagi nanti' },
      { status: 429 },
    )
  }

  const parsed = donationSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    return NextResponse.json(
      {
        ok: false,
        error: Object.values(fields)[0] ?? 'Data tidak valid',
        fields,
      },
      { status: 400 },
    )
  }

  const data = parsed.data

  if (data.categoryId) {
    try {
      const category = await db.category.findUnique({
        where: { id: data.categoryId },
      })
      if (!category || category.type !== 'MASUK' || !category.isActive) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Kategori tidak valid',
            fields: { categoryId: 'Kategori tidak valid' },
          },
          { status: 400 },
        )
      }
    } catch (err) {
      return dbError('gagal memeriksa kategori', err)
    }
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const reference = generateReference()
    try {
      const donation = await db.donation.create({
        data: {
          donorName: data.donorName,
          amount: data.amount,
          categoryId: data.categoryId ?? null,
          message: data.message || null,
          proofImage: data.proofImage || null,
          reference,
          status: 'MENUNGGU',
        },
      })
      return NextResponse.json({ ok: true, reference: donation.reference })
    } catch (err) {
      const retry = isUniqueViolation(err) && attempt < MAX_ATTEMPTS - 1
      if (retry) continue
      return dbError('gagal menyimpan donasi', err)
    }
  }

  // Tidak terjangkau (loop selalu return), tapi tetap aman untuk TypeScript.
  return NextResponse.json(
    { ok: false, error: 'Gagal menyimpan donasi' },
    { status: 500 },
  )
}
