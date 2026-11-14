import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClientIp, hit } from '@/lib/rate-limit'
import { writeLocalUpload } from '@/lib/local-upload'

/** Bukti donasi publik selalu di folder `donations/` (sama dengan jalur R2). */
const PUBLIC_PREFIX = 'donations/'
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

/**
 * PUT /api/upload-local — tujuan upload mode fallback lokal (R2 belum dikonfigurasi).
 * Kontrak klien tidak berubah: `/api/upload` & `/api/upload-public` mengembalikan
 * `uploadUrl` ke sini, klien PUT isi file, `publicUrl` = `/uploads/<key>`.
 * Admin wajib session; scope `public` wajib prefix `donations/` + rate-limit 5/menit.
 */
export async function PUT(req: Request) {
  const url = new URL(req.url)
  const scope = url.searchParams.get('scope')
  const key = url.searchParams.get('key') ?? ''
  const contentType = (req.headers.get('content-type') ?? '').split(';')[0].trim()

  if (scope === 'admin') {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }
  } else if (scope === 'public') {
    if (!key.startsWith(PUBLIC_PREFIX)) {
      return NextResponse.json({ error: 'Prefix tidak valid' }, { status: 400 })
    }
    if (!hit(`upload-local:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan' },
        { status: 429 },
      )
    }
  } else {
    return NextResponse.json({ error: 'Scope tidak valid' }, { status: 400 })
  }

  const declared = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Ukuran file maksimal 5MB' },
      { status: 413 },
    )
  }

  let data: ArrayBuffer
  try {
    data = await req.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const result = await writeLocalUpload(key, contentType, data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
