# Modul Inventaris & Tata Kelola Aset Masjid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun subsistem inventaris, sirkulasi peminjaman & pengembalian peralatan ke warga jamaah, pencatatan pengadaan/wakaf, serta cetak bukti serah terima resmi di dashboard admin Masjid An-Nuur Arwana.

**Architecture:** Modul internal di area admin (`/admin/inventaris/*`) dengan penegakan invarian stok atomik dalam transaksi Prisma (`totalQty = availableQty + borrowedQty + brokenQty`), dukungan pengembalian parsial, pencatatan kondisi fisik saat kembali, integrasi opsional ke buku kas, dan antarmuka ramah cetak (print CSS).

**Tech Stack:** Next.js 15 (App Router, Server Actions), React 19, TypeScript 5, Prisma 7 (PostgreSQL), NextAuth v5 (RBAC), Tailwind CSS v4, Zod, Vitest 5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-11-04-inventaris-masjid-design.md`](file:///Users/a/Documents/DKM/docs/superpowers/specs/2026-11-04-inventaris-masjid-design.md)

## Global Constraints

- Hak akses inventaris dibatasi untuk role `ADMIN` dan `BENDAHARA` via `requireRole('ADMIN', 'BENDAHARA')`.
- Invarian stok harus selalu terpenuhi: $\text{totalQty} = \text{availableQty} + \text{borrowedQty} + \text{brokenQty}$.
- Mutasi stok (pinjam, kembali, pengadaan) harus dibungkus dalam `db.$transaction` atomik.
- Peminjaman barang hanya diizinkan untuk barang berstatus `isBorrowable == true` dan jumlah pinjam $\le \text{availableQty}$.
- Setiap pengembalian mencatat kuantitas kembali baik vs rusak dan nama Petugas PIC penerima.
- Cetak bukti peminjaman dioptimalkan untuk kertas A4/tanda terima dengan layout rapi dan kolom tanda tangan basah Peminjam & Petugas DKM.
- Seluruh tes (Vitest unit test & Playwright E2E) harus tetap lulus 100% tanpa regresi.

---

### Task 1: Prisma Schema & Migrasi Database

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `npx prisma validate`

**Interfaces:**
- Produces: Enum `InventoryCategoryType`, `LoanStatus`, model `InventoryItem`, `InventoryLoan`, `InventoryLoanItem`, `InventoryAcquisition`.

- [ ] **Step 1: Tambahkan enum dan model inventaris ke `prisma/schema.prisma`**
  Tambahkan `InventoryCategoryType`, `LoanStatus`, `InventoryItem`, `InventoryLoan`, `InventoryLoanItem`, dan `InventoryAcquisition` sesuai dokumen spesifikasi.
- [ ] **Step 2: Jalankan validasi skema Prisma**
  Jalankan `npx prisma validate` dan pastikan skema valid.
- [ ] **Step 3: Generate Prisma Client & jalankan migrasi lokal**
  Jalankan `npx prisma migrate dev --name add_inventory_subsystem` atau `prisma generate`.
- [ ] **Step 4: Commit perubahan skema**

---

### Task 2: Lib Inventaris & Invariant Logic

**Files:**
- Create: `src/lib/inventaris.ts`
- Test: `tests/inventaris-invariants.test.ts`

**Interfaces:**
- Produces:
  - `generateLoanCode(): string` (format `PINJAM-YYYYMM-XXXX`)
  - `validateStockAvailability(items: { itemId: string; qty: number }[]): Promise<{ ok: true } | { ok: false; error: string }>`
  - `calculateItemStock(item: { totalQty: number; borrowedQty: number; brokenQty: number }): number`
  - `deriveLoanStatus(items: { borrowedQty: number; returnedQty: number; brokenQty: number; missingQty: number }[], expectedReturn: Date): LoanStatus`

- [ ] **Step 1: Tulis test invarian stok dan helper status sirkulasi di `tests/inventaris-invariants.test.ts`**
  Uji skenario:
  - Ketersediaan stok (lolos jika cukup, gagal jika kurang atau `isBorrowable == false`).
  - Penentuan status pinjaman (`DIPINJAM`, `KEMBALI_SEBAGIAN`, `SELESAI`, `TERLAMBAT`).
  - Rumus invarian `totalQty = availableQty + borrowedQty + brokenQty`.
- [ ] **Step 2: Jalankan test untuk memastikan test gagal (merah)**
- [ ] **Step 3: Implementasikan fungsi di `src/lib/inventaris.ts`**
- [ ] **Step 4: Jalankan test kembali untuk memastikan test lolos (hijau)**
- [ ] **Step 5: Commit perubahan modul inventaris logic**

---

### Task 3: RBAC & Navigasi Admin

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/components/admin/nav.ts`
- Test: `tests/rbac.test.ts` & `tests/nav.test.ts`

**Interfaces:**
- Consumes: Action `'manage_inventory'`
- Produces: Menu navigasi `Inventaris` di sidebar admin untuk `ADMIN` dan `BENDAHARA`.

- [ ] **Step 1: Tambahkan test izin `'manage_inventory'` di `tests/rbac.test.ts` dan navigasi di `tests/nav.test.ts`**
- [ ] **Step 2: Tambahkan action `'manage_inventory'` pada role `ADMIN` dan `BENDAHARA` di `src/lib/rbac.ts`**
- [ ] **Step 3: Tambahkan navigasi Inventaris di `src/components/admin/nav.ts`**
  Tambahkan entry `Inventaris` (`/admin/inventaris`) dengan sub-menu: *Katalog Barang*, *Peminjaman*, dan *Pengadaan*.
- [ ] **Step 4: Jalankan test untuk memastikan seluruh pengujian lolos**
- [ ] **Step 5: Commit konfigurasi RBAC & navigasi**

---

### Task 4: Server Actions Inventaris

**Files:**
- Create: `src/app/admin/(dashboard)/inventaris/schema.ts`
- Create: `src/app/admin/(dashboard)/inventaris/actions.ts`
- Test: `tests/inventaris-actions.test.ts`

**Interfaces:**
- Produces:
  - `saveInventoryItem(data: ItemInput): Promise<ActionResult>`
  - `deleteInventoryItem(id: string): Promise<ActionResult>`
  - `createLoan(data: CreateLoanInput): Promise<ActionResult<{ loanId: string }>>`
  - `recordReturn(data: RecordReturnInput): Promise<ActionResult>`
  - `createAcquisition(data: AcquisitionInput): Promise<ActionResult>`

- [ ] **Step 1: Tulis unit test untuk Server Actions di `tests/inventaris-actions.test.ts`**
  Mock database dan verifikasi:
  - Validasi Zod schema (nama kosong, stok < 0 ditolak).
  - Peminjaman barang sukses memutasi `availableQty` dan `borrowedQty`.
  - Pengembalian sukses mengembalikan stok dan mencatat `brokenQty`.
  - Pembuatan Transaksi Kas Keluar otomatis saat pengadaan pembelian kas dipilih.
- [ ] **Step 2: Jalankan test untuk memastikan gagal**
- [ ] **Step 3: Buat skema validasi Zod di `src/app/admin/(dashboard)/inventaris/schema.ts`**
- [ ] **Step 4: Implementasikan Server Actions di `src/app/admin/(dashboard)/inventaris/actions.ts`**
  Bungkus setiap mutasi stok dalam Prisma `$transaction` atomik dan revalidate path terkait.
- [ ] **Step 5: Jalankan test untuk memastikan seluruhnya lolos**
- [ ] **Step 6: Commit Server Actions inventaris**

---

### Task 5: Halaman Katalog Barang & Stok (`/admin/inventaris`)

**Files:**
- Create: `src/app/admin/(dashboard)/inventaris/page.tsx`
- Create: `src/app/admin/(dashboard)/inventaris/ItemModal.tsx`
- Create: `src/app/admin/(dashboard)/inventaris/InventoryMetrics.tsx`
- Test: `tests/inventaris-ui.test.tsx`

**Interfaces:**
- Consumes: `db.inventoryItem`, Server Action `saveInventoryItem`, `deleteInventoryItem`
- Produces: Halaman manajemen aset dengan kartu ringkasan metrik dan tabel inventaris interaktif.

- [ ] **Step 1: Buat pengujian komponen tabel dan modal inventaris di `tests/inventaris-ui.test.tsx`**
- [ ] **Step 2: Buat komponen `InventoryMetrics.tsx` untuk menampilkan ringkasan stok aset**
- [ ] **Step 3: Buat modal form tambah/edit barang `ItemModal.tsx`**
- [ ] **Step 4: Buat halaman `src/app/admin/(dashboard)/inventaris/page.tsx`**
- [ ] **Step 5: Verifikasi rendering dan filter halaman katalog**
- [ ] **Step 6: Commit halaman katalog barang**

---

### Task 6: Halaman Sirkulasi Peminjaman & Modal Pengembalian

**Files:**
- Create: `src/app/admin/(dashboard)/inventaris/peminjaman/page.tsx`
- Create: `src/app/admin/(dashboard)/inventaris/peminjaman/baru/page.tsx`
- Create: `src/app/admin/(dashboard)/inventaris/peminjaman/ReturnModal.tsx`
- Test: `tests/inventaris-peminjaman.test.tsx`

**Interfaces:**
- Consumes: Server Action `createLoan`, `recordReturn`, `db.inventoryLoan`
- Produces: Halaman daftar pinjaman aktif/selesai, formulir peminjaman multi-barang, dan modal pengembalian.

- [ ] **Step 1: Tulis pengujian alur pinjam dan pengembalian di `tests/inventaris-peminjaman.test.tsx`**
- [ ] **Step 2: Buat halaman form peminjaman multi-barang `baru/page.tsx` dengan pemilih barang real-time**
- [ ] **Step 3: Buat modal `ReturnModal.tsx` untuk mencatat barang kembali baik vs rusak**
- [ ] **Step 4: Buat halaman daftar pinjaman `peminjaman/page.tsx` dengan filter tab Aktif vs Selesai dan status TERLAMBAT**
- [ ] **Step 5: Jalankan test dan verifikasi**
- [ ] **Step 6: Commit halaman sirkulasi peminjaman**

---

### Task 7: Halaman Cetak Tanda Terima Bukti Pinjam

**Files:**
- Create: `src/app/admin/(dashboard)/inventaris/peminjaman/[id]/cetak/page.tsx`
- Test: `tests/inventaris-cetak.test.tsx`

**Interfaces:**
- Consumes: `db.inventoryLoan`, `getSetting('site.name')`
- Produces: Layout cetak resmi bukti serah terima peminjaman barang masjid.

- [ ] **Step 1: Tulis test rendering halaman cetak di `tests/inventaris-cetak.test.tsx`**
- [ ] **Step 2: Buat halaman cetak `[id]/cetak/page.tsx`**
  Gunakan layout formal: kop DKM Masjid An-Nuur Arwana, nomor pinjam, data peminjam, tabel barang & jumlah, syarat & ketentuan, serta kotak tanda tangan basah Peminjam & Petugas DKM. Tambahkan tombol browser print (`window.print()`).
- [ ] **Step 3: Jalankan test dan verifikasi visual print stylesheet**
- [ ] **Step 4: Commit halaman cetak tanda terima**

---

### Task 8: Halaman Riwayat Pengadaan & Integrasi Kas

**Files:**
- Create: `src/app/admin/(dashboard)/inventaris/pengadaan/page.tsx`
- Create: `src/app/admin/(dashboard)/inventaris/pengadaan/AcquisitionModal.tsx`

**Interfaces:**
- Consumes: `db.inventoryAcquisition`, Server Action `createAcquisition`
- Produces: Halaman log pengadaan aset baru (beli kas / wakaf) dan modal pencatatan.

- [ ] **Step 1: Buat komponen modal `AcquisitionModal.tsx`**
- [ ] **Step 2: Buat halaman `src/app/admin/(dashboard)/inventaris/pengadaan/page.tsx`**
- [ ] **Step 3: Uji pencatatan pengadaan wakaf dan pengadaan beli kas**
- [ ] **Step 4: Commit halaman pengadaan inventaris**

---

### Task 9: Verifikasi Penuh (Lint, Typecheck, Test Suite, & Build)

**Files:**
- Test: Seluruh suite pengujian aplikasi

- [ ] **Step 1: Jalankan ESLint (`npm run lint`)**
- [ ] **Step 2: Jalankan TypeScript typecheck (`npx tsc --noEmit`)**
- [ ] **Step 3: Jalankan seluruh unit test (`npm test`)**
- [ ] **Step 4: Jalankan build produksi (`npm run build`)**
- [ ] **Step 5: Jalankan Playwright E2E smoke tests (`npx playwright test`)**
- [ ] **Step 6: Commit final & push**
