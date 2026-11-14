import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureProgramAndProposalTables, checkProgramAndProposalTables, resetTablesInitCache } from '@/lib/program-proposal-init'

export async function GET() {
  const session = await auth()
  const role = session?.user?.role

  if (!session || (role !== 'ADMIN' && role !== 'KONTEN')) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Harap login sebagai Admin/Konten terlebih dahulu.' },
      { status: 401 }
    )
  }

  resetTablesInitCache()
  const before = await checkProgramAndProposalTables()
  const result = await ensureProgramAndProposalTables()
  const after = await checkProgramAndProposalTables()

  return NextResponse.json({
    ok: result.ok,
    message: result.ok
      ? 'Sinkronisasi tabel database berhasil!'
      : `Gagal: ${result.error}`,
    statusBefore: before,
    statusAfter: after,
    details: result,
  })
}

export async function POST() {
  return GET()
}

