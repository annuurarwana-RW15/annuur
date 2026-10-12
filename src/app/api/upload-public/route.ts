import { NextResponse } from 'next/server'
import { getPresignedPutUrl, publicUrl, r2Key } from '@/lib/r2'
import { getClientIp, hit } from '@/lib/rate-limit'

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

const MAX_SIZE = 5 * 1024 * 1024
/** Bukti donasi publik selalu disimpan di folder ini — prefix pemanggil diabaikan. */
const PREFIX = 'donations'
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

/**
 * POST /api/upload-public — bukti donasi (publik, tanpa session).
 * Kontrak sama dengan `/api/upload` (minus auth): `{filename, contentType,
 * size}` → `{uploadUrl, publicUrl, key}` dengan prefix paksa `donations/`.
 * Rate-limit in-memory 10/menit per IP; file divalidasi server-side
 * (jpg/png/webp ≤5MB, ekstensi cocok, nama tersanitasi oleh `r2Key`).
 */
export async function POST(req: Request) {
  if (!hit(`upload-public:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429 },
    )
  }

  let body: {
    filename?: unknown
    contentType?: unknown
    size?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const filename = String(body.filename ?? '').trim()
  const contentType = String(body.contentType ?? '').trim()
  const size = body.size

  const allowedExts = ALLOWED_TYPES[contentType]
  if (!allowedExts) {
    return NextResponse.json(
      { error: 'Tipe file tidak diizinkan' },
      { status: 400 },
    )
  }

  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json(
      { error: 'Ukuran file tidak valid' },
      { status: 400 },
    )
  }
  if (size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Ukuran file maksimal 5MB' },
      { status: 400 },
    )
  }

  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
    : ''
  if (!ext) {
    return NextResponse.json({ error: 'Nama file tidak valid' }, { status: 400 })
  }
  if (!allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: `Ekstensi .${ext} tidak cocok dengan ${contentType}` },
      { status: 400 },
    )
  }

  const base = filename
    .slice(0, filename.lastIndexOf('.'))
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!base) {
    return NextResponse.json(
      { error: 'Nama file tidak valid' },
      { status: 400 },
    )
  }

  try {
    const key = r2Key(PREFIX, filename)
    const uploadUrl = await getPresignedPutUrl(key, contentType)
    return NextResponse.json({
      uploadUrl,
      publicUrl: publicUrl(key),
      key,
    })
  } catch (err) {
    console.error(
      '[upload-public] gagal membuat URL upload:',
      err instanceof Error ? err.message : err,
    )
    return NextResponse.json(
      { error: 'Gagal membuat URL upload' },
      { status: 500 },
    )
  }
}
