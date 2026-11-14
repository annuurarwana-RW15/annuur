import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { slugify } from '@/lib/slugify'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_SIZE = 15 * 1024 * 1024

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

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipe file harus PDF atau Gambar (JPG/PNG/WebP)' },
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

  const originalName = file.name || 'berkas'
  const dot = originalName.lastIndexOf('.')
  const ext =
    dot >= 0
      ? originalName.slice(dot + 1).toLowerCase()
      : file.type === 'application/pdf'
      ? 'pdf'
      : 'jpg'
  const baseName = slugify(dot >= 0 ? originalName.slice(0, dot) : originalName) || 'proposal'
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${baseName}.${ext}`

  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'proposals')
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(path.join(targetDir, filename), buffer)

  const publicUrl = `/uploads/proposals/${filename}`
  return NextResponse.json({ url: publicUrl, size: file.size })
}

