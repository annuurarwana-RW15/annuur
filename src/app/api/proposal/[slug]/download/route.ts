import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { db } from '@/lib/db'
import { slugify } from '@/lib/slugify'

interface RouteProps {
  params: Promise<{
    slug: string
  }>
}

export async function GET(req: Request, props: RouteProps) {
  const { slug } = await props.params

  if (!slug) {
    return NextResponse.json({ error: 'Slug proposal tidak valid' }, { status: 400 })
  }

  const proposal = await db.proposal.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      filePdf: true,
      filePdfSize: true,
    },
  })

  if (!proposal || !proposal.filePdf) {
    return NextResponse.json(
      { error: 'Berkas proposal PDF belum diunggah atau tidak ditemukan' },
      { status: 404 },
    )
  }

  // Jika berupa URL eksternal (misal: Google Drive / Cloud Hosting)
  if (proposal.filePdf.startsWith('http://') || proposal.filePdf.startsWith('https://')) {
    return NextResponse.redirect(proposal.filePdf)
  }

  // File PDF lokal di direktori public
  const relativePath = proposal.filePdf.startsWith('/')
    ? proposal.filePdf.slice(1)
    : proposal.filePdf
  const filePath = path.join(process.cwd(), 'public', relativePath)

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: 'File fisik PDF proposal tidak ditemukan di server' },
      { status: 404 },
    )
  }

  try {
    const fileBuffer = await fs.readFile(filePath)
    const rawSafeTitle = slugify(proposal.title) || 'proposal-dkm-an-nuur'
    const downloadFilename = `${rawSafeTitle}.pdf`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err) {
    console.error('[DownloadProposal] Gagal membaca berkas PDF:', err)
    return NextResponse.json(
      { error: 'Gagal mengunduh berkas PDF proposal' },
      { status: 500 },
    )
  }
}

