import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { slugify } from '@/lib/slugify'

const ALLOWED_MIME_TO_EXT: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/x-pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

const MAX_SIZE = 15 * 1024 * 1024

function validateMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false
  if (mime === 'application/pdf' || mime === 'application/x-pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  }
  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }
  if (mime === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Data form tidak valid' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  const originalName = file.name || 'berkas'
  const dot = originalName.lastIndexOf('.')
  const rawExt = dot >= 0 ? originalName.slice(dot + 1).toLowerCase() : ''

  // Fallback deteksi MIME jika browser mengirim kosong atau x-pdf
  const effectiveMime =
    file.type ||
    (rawExt === 'pdf' ? 'application/pdf' : '') ||
    (rawExt === 'jpg' || rawExt === 'jpeg' ? 'image/jpeg' : '') ||
    (rawExt === 'png' ? 'image/png' : '') ||
    (rawExt === 'webp' ? 'image/webp' : '')

  const validExts = ALLOWED_MIME_TO_EXT[effectiveMime]
  if (!validExts) {
    return NextResponse.json(
      { error: 'Tipe file harus PDF atau Gambar (JPG/PNG/WebP)' },
      { status: 400 },
    )
  }

  if (!rawExt || !validExts.includes(rawExt)) {
    return NextResponse.json(
      { error: `Ekstensi .${rawExt || 'unknown'} tidak cocok dengan tipe file ${file.type || effectiveMime}` },
      { status: 400 },
    )
  }

  if (file.size <= 0 || file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Ukuran file harus antara 1 byte hingga 15MB' },
      { status: 400 },
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (!validateMagicBytes(buffer, effectiveMime)) {
    return NextResponse.json(
      { error: 'Isi file tidak sesuai dengan format yang diizinkan (verifikasi header gagal)' },
      { status: 400 },
    )
  }

  const baseName =
    slugify(dot >= 0 ? originalName.slice(0, dot) : originalName).replace(/[^a-z0-9-]/g, '') ||
    'proposal'
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${baseName}.${rawExt}`

  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'proposals')
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(path.join(targetDir, filename), buffer)

  const publicUrl = `/uploads/proposals/${filename}`
  return NextResponse.json({ url: publicUrl, size: file.size })
}

