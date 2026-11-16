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
    },
  })

  if (!proposal || !proposal.filePdf) {
    return NextResponse.json(
      { error: 'Berkas proposal PDF belum diunggah atau tidak ditemukan' },
      { status: 404 },
    )
  }

  if (proposal.filePdf.startsWith('http://') || proposal.filePdf.startsWith('https://')) {
    return NextResponse.redirect(proposal.filePdf)
  }

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
    const viewFilename = `${rawSafeTitle}.pdf`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${viewFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (err) {
    console.error('[ViewProposal] Gagal membuka berkas PDF:', err)
    return NextResponse.json(
      { error: 'Gagal membuka berkas PDF proposal' },
      { status: 500 },
    )
  }
}
