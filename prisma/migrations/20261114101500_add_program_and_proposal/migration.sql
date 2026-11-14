-- CreateEnum ProgramPeriodType
DO $$ BEGIN
    CREATE TYPE "ProgramPeriodType" AS ENUM ('PENDEK', 'PANJANG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum ProgramCategory
DO $$ BEGIN
    CREATE TYPE "ProgramCategory" AS ENUM ('IDARAH', 'IMARAH', 'RIAYAH', 'SOSIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum ProgramStatus
DO $$ BEGIN
    CREATE TYPE "ProgramStatus" AS ENUM ('DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'DITUNDA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum ProposalStatus
DO $$ BEGIN
    CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'DIBUKA', 'TERPENUHI', 'SELESAI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable Program
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

-- CreateTable Proposal
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Program_slug_key" ON "Program"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Program_periodType_status_idx" ON "Program"("periodType", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_slug_key" ON "Proposal"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Proposal_status_isFeatured_idx" ON "Proposal"("status", "isFeatured");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Proposal_programId_idx" ON "Proposal"("programId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_categoryId_fkey'
    ) THEN
        ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_programId_fkey'
    ) THEN
        ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
