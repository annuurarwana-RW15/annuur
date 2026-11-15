import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/rbac'
import { createDatabaseBackup } from '@/lib/database-backup'

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const backupData = await createDatabaseBackup()
    const now = new Date()
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup-dkm-annur-${dateStr}.json`

    const jsonString = JSON.stringify(backupData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error) {
    console.error('[API Backup] Gagal membuat cadangan database:', error)
    return NextResponse.json(
      { error: 'Gagal membuat cadangan basis data' },
      { status: 500 },
    )
  }
}
