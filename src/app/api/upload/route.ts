import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPresignedPutUrl, publicUrl, r2Key } from '@/lib/r2'

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  let body: { filename?: string; contentType?: string; prefix?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const filename = String(body.filename ?? '').trim()
  const contentType = String(body.contentType ?? '').trim()
  const prefix = String(body.prefix ?? 'uploads').trim() || 'uploads'

  const allowedExts = ALLOWED_TYPES[contentType]
  if (!allowedExts) {
    return NextResponse.json(
      { error: 'Tipe file tidak diizinkan' },
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
    const key = r2Key(prefix, filename)
    const uploadUrl = await getPresignedPutUrl(key, contentType)
    return NextResponse.json({
      uploadUrl,
      publicUrl: publicUrl(key),
      key,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
