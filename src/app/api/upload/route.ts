import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPresignedPutUrl, publicUrl, r2Key } from '@/lib/r2'
import {
  isR2Configured,
  localPublicUrl,
  localUploadUrl,
} from '@/lib/local-upload'

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

const MAX_SIZE = 5 * 1024 * 1024
const PREFIX_RE = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  let body: {
    filename?: string
    contentType?: string
    prefix?: string
    size?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const filename = String(body.filename ?? '').trim()
  const contentType = String(body.contentType ?? '').trim()
  const prefix = String(body.prefix ?? 'uploads').trim() || 'uploads'
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

  if (!PREFIX_RE.test(prefix)) {
    return NextResponse.json({ error: 'Prefix tidak valid' }, { status: 400 })
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

  // Fallback lokal bila R2 belum dikonfigurasi (masih `""` di .env): kontrak sama,
  // file ditulis ke public/uploads lewat PUT /api/upload-local.
  if (!isR2Configured()) {
    const key = r2Key(prefix, filename)
    return NextResponse.json({
      uploadUrl: localUploadUrl('admin', key),
      publicUrl: localPublicUrl(key),
      key,
      local: true,
    })
  }

  try {
    const key = r2Key(prefix, filename)
    const uploadUrl = await getPresignedPutUrl(key, contentType)
    return NextResponse.json({
      uploadUrl,
      publicUrl: publicUrl(key),
      key,
    })
  } catch (err) {
    console.error(
      '[upload] gagal membuat URL upload:',
      err instanceof Error ? err.message : err,
    )
    return NextResponse.json(
      { error: 'Gagal membuat URL upload' },
      { status: 500 },
    )
  }
}
