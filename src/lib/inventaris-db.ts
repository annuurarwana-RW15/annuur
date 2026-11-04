import { db } from './db'

let isInitialized = false

/**
 * Memastikan tabel, enum, dan indeks inventaris ada di database.
 * Bersifat idempoten dan aman dijalankan pada koneksi pooled PostgreSQL/Supabase.
 */
export async function ensureInventoryTables(): Promise<void> {
  if (isInitialized) return

  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InventoryCategoryType" AS ENUM ('SARPRAS_UMUM', 'ELEKTRONIK_AUDIO', 'IBADAH_PENGAJIAN', 'RUKUN_KEMATIAN', 'KEBERSIHAN_DAPUR');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "LoanStatus" AS ENUM ('DIPINJAM', 'KEMBALI_SEBAGIAN', 'SELESAI', 'TERLAMBAT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "InventoryItem" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" "InventoryCategoryType" NOT NULL DEFAULT 'SARPRAS_UMUM',
        "location" TEXT NOT NULL,
        "isBorrowable" BOOLEAN NOT NULL DEFAULT true,
        "totalQty" INTEGER NOT NULL DEFAULT 1,
        "availableQty" INTEGER NOT NULL DEFAULT 1,
        "borrowedQty" INTEGER NOT NULL DEFAULT 0,
        "brokenQty" INTEGER NOT NULL DEFAULT 0,
        "isWaqf" BOOLEAN NOT NULL DEFAULT false,
        "waqfDonor" TEXT,
        "priceEstimate" DECIMAL(18,2),
        "notes" TEXT,
        "image" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "InventoryLoan" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "borrowerName" TEXT NOT NULL,
        "borrowerPhone" TEXT NOT NULL,
        "borrowerAddress" TEXT,
        "purpose" TEXT NOT NULL,
        "loanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expectedReturn" TIMESTAMP(3) NOT NULL,
        "actualReturn" TIMESTAMP(3),
        "status" "LoanStatus" NOT NULL DEFAULT 'DIPINJAM',
        "officerOut" TEXT NOT NULL,
        "officerIn" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InventoryLoan_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "InventoryLoanItem" (
        "id" TEXT NOT NULL,
        "loanId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "borrowedQty" INTEGER NOT NULL,
        "returnedQty" INTEGER NOT NULL DEFAULT 0,
        "brokenQty" INTEGER NOT NULL DEFAULT 0,
        "missingQty" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "InventoryLoanItem_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "InventoryAcquisition" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "source" TEXT NOT NULL,
        "unitPrice" DECIMAL(18,2),
        "donorName" TEXT,
        "officer" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "transactionId" TEXT,
        CONSTRAINT "InventoryAcquisition_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_code_key" ON "InventoryItem"("code");
      CREATE INDEX IF NOT EXISTS "InventoryItem_category_isBorrowable_idx" ON "InventoryItem"("category", "isBorrowable");
      CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLoan_code_key" ON "InventoryLoan"("code");
      CREATE INDEX IF NOT EXISTS "InventoryLoan_status_expectedReturn_idx" ON "InventoryLoan"("status", "expectedReturn");
      CREATE INDEX IF NOT EXISTS "InventoryLoan_loanDate_idx" ON "InventoryLoan"("loanDate");
      CREATE UNIQUE INDEX IF NOT EXISTS "InventoryAcquisition_transactionId_key" ON "InventoryAcquisition"("transactionId");

      DO $$ BEGIN
        ALTER TABLE "InventoryLoanItem" ADD CONSTRAINT "InventoryLoanItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "InventoryLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "InventoryLoanItem" ADD CONSTRAINT "InventoryLoanItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "InventoryAcquisition" ADD CONSTRAINT "InventoryAcquisition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "InventoryAcquisition" ADD CONSTRAINT "InventoryAcquisition_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `)
    isInitialized = true
  } catch (error) {
    console.error('[ensureInventoryTables error]', error)
  }
}

