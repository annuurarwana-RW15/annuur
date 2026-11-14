import { db } from './db'

let hasEnsuredTables = false

export function resetTablesInitCache(): void {
  hasEnsuredTables = false
}

/**
 * Memastikan tabel `Program` dan `Proposal` serta enum-enum terkait
 * sudah tersedia di database (bersifat idempoten).
 * Sangat penting untuk runtime produksi jika migrasi Prisma belum dijalankan manual.
 */
export async function ensureProgramAndProposalTables(): Promise<void> {
  if (hasEnsuredTables) return
  if (typeof db.$executeRawUnsafe !== 'function') return

  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
          CREATE TYPE "ProgramPeriodType" AS ENUM ('PENDEK', 'PANJANG');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE "ProgramCategory" AS ENUM ('IDARAH', 'IMARAH', 'RIAYAH', 'SOSIAL');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE "ProgramStatus" AS ENUM ('DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'DITUNDA');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'DIBUKA', 'TERPENUHI', 'SELESAI');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

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

      CREATE UNIQUE INDEX IF NOT EXISTS "Program_slug_key" ON "Program"("slug");
      CREATE INDEX IF NOT EXISTS "Program_periodType_status_idx" ON "Program"("periodType", "status");
      CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_slug_key" ON "Proposal"("slug");
      CREATE INDEX IF NOT EXISTS "Proposal_status_isFeatured_idx" ON "Proposal"("status", "isFeatured");
      CREATE INDEX IF NOT EXISTS "Proposal_programId_idx" ON "Proposal"("programId");

      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_categoryId_fkey'
          ) THEN
              ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;

      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_programId_fkey'
          ) THEN
              ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;
    `)
    hasEnsuredTables = true
  } catch (err) {
    console.error('[ensureProgramAndProposalTables] Gagal memastikan tabel:', err)
  }
}

