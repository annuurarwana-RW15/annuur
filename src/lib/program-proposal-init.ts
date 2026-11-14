import { db } from './db'

let hasEnsuredTables = false

export function resetTablesInitCache(): void {
  hasEnsuredTables = false
}

export interface EnsureTablesResult {
  ok: boolean
  alreadyExisted?: boolean
  created?: boolean
  error?: string
}

/**
 * Memeriksa apakah tabel `Program` dan `Proposal` sudah ada di database.
 */
export async function checkProgramAndProposalTables(): Promise<{
  program: boolean
  proposal: boolean
}> {
  if (typeof db.$queryRawUnsafe !== 'function') {
    return { program: true, proposal: true }
  }

  try {
    const res = await db.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Program', 'Proposal')`
    )
    const names = (res || []).map((r) => r.tablename)
    return {
      program: names.includes('Program'),
      proposal: names.includes('Proposal'),
    }
  } catch (err) {
    console.warn('[checkProgramAndProposalTables] Gagal memeriksa pg_tables:', err)
    return { program: false, proposal: false }
  }
}

async function ensureEnum(typeName: string, values: string[]): Promise<void> {
  const existing = await db.$queryRawUnsafe<Array<{ typname: string }>>(
    `SELECT typname FROM pg_type WHERE typname = $1`,
    typeName
  )
  if (!existing || existing.length === 0) {
    const formattedValues = values.map((v) => `'${v}'`).join(', ')
    await db.$executeRawUnsafe(`CREATE TYPE "${typeName}" AS ENUM (${formattedValues});`)
  }
}

async function ensureConstraint(
  constraintName: string,
  addConstraintSql: string
): Promise<void> {
  const existing = await db.$queryRawUnsafe<Array<{ conname: string }>>(
    `SELECT conname FROM pg_constraint WHERE conname = $1`,
    constraintName
  )
  if (!existing || existing.length === 0) {
    await db.$executeRawUnsafe(addConstraintSql)
  }
}

/**
 * Memastikan tabel `Program` dan `Proposal` serta enum dan relasinya
 * sudah dibuat di database PostgreSQL secara idempoten tanpa menggunakan
 * blok DO $$ yang rentan gagal di PgBouncer Transaction Pooler.
 */
export async function ensureProgramAndProposalTables(): Promise<EnsureTablesResult> {
  if (hasEnsuredTables) {
    return { ok: true, alreadyExisted: true }
  }

  if (
    typeof db.$executeRawUnsafe !== 'function' ||
    typeof db.$queryRawUnsafe !== 'function'
  ) {
    return { ok: true, alreadyExisted: true }
  }

  try {
    const current = await checkProgramAndProposalTables()
    if (current.program && current.proposal) {
      hasEnsuredTables = true
      return { ok: true, alreadyExisted: true }
    }

    // 1. Pastikan Enums tersedia
    await ensureEnum('ProgramPeriodType', ['PENDEK', 'PANJANG'])
    await ensureEnum('ProgramCategory', ['IDARAH', 'IMARAH', 'RIAYAH', 'SOSIAL'])
    await ensureEnum('ProgramStatus', [
      'DIRENCANAKAN',
      'BERJALAN',
      'SELESAI',
      'DITUNDA',
    ])
    await ensureEnum('ProposalStatus', ['DRAFT', 'DIBUKA', 'TERPENUHI', 'SELESAI'])

    // 2. Buat tabel Program
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Program" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "periodType" "ProgramPeriodType" NOT NULL DEFAULT 'PENDEK',
        "category" "ProgramCategory" NOT NULL DEFAULT 'IMARAH',
        "status" "ProgramStatus" NOT NULL DEFAULT 'DIRENCANAKAN',
        "progress" INTEGER NOT NULL DEFAULT 0,
        "targetDate" TIMESTAMP(3),
        "budgetEstimate" DECIMAL(18,2),
        "picName" TEXT,
        "picPhone" TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
      );
    `)

    // 3. Buat tabel Proposal
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Proposal" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "summary" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "coverImage" TEXT,
        "filePdf" TEXT,
        "filePdfSize" TEXT,
        "targetAmount" DECIMAL(18,2) NOT NULL,
        "collectedManual" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "categoryId" TEXT,
        "programId" TEXT,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "status" "ProposalStatus" NOT NULL DEFAULT 'DIBUKA',
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "picName" TEXT,
        "picPhone" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
      );
    `)

    // 4. Buat Indeks
    await db.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Program_slug_key" ON "Program"("slug");`
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Program_periodType_status_idx" ON "Program"("periodType", "status");`
    )
    await db.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_slug_key" ON "Proposal"("slug");`
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Proposal_status_isFeatured_idx" ON "Proposal"("status", "isFeatured");`
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Proposal_programId_idx" ON "Proposal"("programId");`
    )

    // 5. Buat Foreign Key
    try {
      await ensureConstraint(
        'Proposal_categoryId_fkey',
        `ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
      )
    } catch (e) {
      console.warn('[ensureProgramAndProposalTables] Info fk categoryId:', e)
    }

    try {
      await ensureConstraint(
        'Proposal_programId_fkey',
        `ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
      )
    } catch (e) {
      console.warn('[ensureProgramAndProposalTables] Info fk programId:', e)
    }

    hasEnsuredTables = true
    return { ok: true, created: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ensureProgramAndProposalTables] Gagal membuat tabel:', message)
    return { ok: false, error: message }
  }
}
