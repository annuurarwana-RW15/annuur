# Program Kerja & Proposal Terbuka Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul Program Kerja (jangka pendek & panjang beserta capaian progress) dan Proposal Terbuka (penggalangan dana, target RAB, unggah & unduh berkas PDF resmi, serta cuplikan di homepage) yang dapat dikelola penuh dari Dashboard Admin dan terintegrasi di navbar publik.

**Architecture:** Memperluas skema Prisma PostgreSQL dengan model `Program` dan `Proposal`. Menyediakan Server Actions untuk CRUD dan kalkulasi dana donasi (online + manual). Mengubah menu `Kegiatan & Program` di header menjadi dropdown interaktif, menyediakan halaman publik `/program`, `/proposal`, dan `/proposal/[slug]`, menambahkan seksi cuplikan di beranda, serta menyediakan panel dashboard admin `/admin/program` dan `/admin/proposal`.

**Tech Stack:** Next.js 15 (App Router, Server Components, Server Actions), Prisma ORM (PostgreSQL), Tailwind CSS v4, Lucide/SVG Icons, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-14-program-dan-proposal-design.md](file:///Users/a/Documents/DKM/docs/superpowers/specs/2026-11-14-program-dan-proposal-design.md)

## Global Constraints
- Bahasa antarmuka publik dan dashboard: Bahasa Indonesia yang rapi, santun, dan bernuansa Islami modern.
- Desain mobile-first: Semua komponen harus rapi tanpa overlap di layar ponsel (viewport 360px–390px).
- Tidak ada breaking changes pada fitur yang sudah ada (Agenda Kegiatan `/kegiatan`, Laporan Kas, Donasi, Quran, dll.).
- Dokumen PDF proposal dapat diunggah melalui endpoint upload yang sudah tersedia dan dapat diunduh langsung oleh publik.
- Seluruh pengujian Vitest (73+ test files) harus tetap 100% lulus (green).

---

### Task 1: Skema Prisma & Model Database

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/program-proposal-schema.test.ts`

**Interfaces:**
- Produces: Model `Program`, Model `Proposal`, Enum `ProgramPeriodType`, `ProgramCategory`, `ProgramStatus`, `ProposalStatus`.

- [ ] **Step 1: Tulis unit test untuk verifikasi tipe & helper Prisma Program & Proposal**
  Buat `tests/program-proposal-schema.test.ts` untuk memastikan model dan tipe data dapat diimpor dan divalidasi.
- [ ] **Step 2: Tambahkan Enum dan Model `Program` serta `Proposal` di `prisma/schema.prisma`**
  Definisikan relasi `Proposal` ke `Category` kas dan relasi opsional `Proposal` ke `Program`.
- [ ] **Step 3: Jalankan `npx prisma db push` (atau `prisma generate`)**
  Update client Prisma untuk mengompilasi model baru.
- [ ] **Step 4: Jalankan test dan pastikan lulus**
- [ ] **Step 5: Git commit skema Prisma**

---

### Task 2: Data Access & Server Actions (Program & Proposal)

**Files:**
- Create: `src/lib/program.ts`
- Create: `src/lib/proposal.ts`
- Test: `tests/program-data.test.ts`
- Test: `tests/proposal-data.test.ts`

**Interfaces:**
- Produces:
  - `getAllPrograms(filter?: { periodType?: string, status?: string })`
  - `getProgramBySlug(slug: string)`
  - `getAllProposals(filter?: { status?: string, featuredOnly?: boolean })`
  - `getProposalBySlug(slug: string)`
  - `calculateProposalFunding(proposalId: string)`: Menghitung `collectedManual + SUM(donations online terverifikasi)`

- [ ] **Step 1: Tulis test untuk helper kalkulasi & query Program dan Proposal**
- [ ] **Step 2: Implementasikan `src/lib/program.ts`**
- [ ] **Step 3: Implementasikan `src/lib/proposal.ts` dengan logika kalkulasi total donasi**
- [ ] **Step 4: Jalankan test dan pastikan lulus**
- [ ] **Step 5: Git commit helper data**

---

### Task 3: Pembaharuan Navbar Dropdown "Kegiatan & Program"

**Files:**
- Modify: `src/components/public/nav.ts`
- Modify: `src/components/public/PublicHeader.tsx`
- Test: `tests/public-header.test.tsx`

**Interfaces:**
- Consumes: `PUBLIC_NAV`
- Produces: Menu Dropdown `Kegiatan & Program` yang memuat `Agenda Kegiatan` (`/kegiatan`), `Program Kerja` (`/program`), dan `Proposal Terbuka` (`/proposal`).

- [ ] **Step 1: Perbarui test `tests/public-header.test.tsx` untuk memvalidasi sub-menu baru**
- [ ] **Step 2: Modifikasi `src/components/public/nav.ts` untuk mengubah `Kegiatan & Program` menjadi item beranak (`children`)**
- [ ] **Step 3: Sesuaikan icon atau helper dropdown di `PublicHeader.tsx` bila diperlukan**
- [ ] **Step 4: Jalankan test dan pastikan lulus**
- [ ] **Step 5: Git commit navbar**

---

### Task 4: Halaman Publik Program Kerja (`/program`)

**Files:**
- Create: `src/app/(public)/program/page.tsx`
- Create: `src/components/public/ProgramListClient.tsx`
- Create: `src/components/public/ProgramCard.tsx`
- Test: `tests/program-page.test.tsx`

**Interfaces:**
- Consumes: `getAllPrograms()` dari `src/lib/program.ts`
- Produces: Halaman publik `/program` dengan filter tab interaktif (`Semua`, `Jangka Pendek`, `Jangka Panjang`, `Selesai`), progress bar visual, dan badge link proposal.

- [ ] **Step 1: Tulis test halaman `/program` dan komponen `ProgramCard`**
- [ ] **Step 2: Implementasikan `ProgramCard.tsx` dengan progress bar, badge periode, dan detail PIC**
- [ ] **Step 3: Implementasikan `ProgramListClient.tsx` dengan tab filter responsif mobile-friendly**
- [ ] **Step 4: Implementasikan `src/app/(public)/program/page.tsx`**
- [ ] **Step 5: Jalankan test dan pastikan lulus**
- [ ] **Step 6: Git commit halaman program kerja**

---

### Task 5: Halaman Publik Proposal Terbuka (`/proposal` & `/proposal/[slug]`)

**Files:**
- Create: `src/app/(public)/proposal/page.tsx`
- Create: `src/app/(public)/proposal/[slug]/page.tsx`
- Create: `src/components/public/ProposalCard.tsx`
- Create: `src/components/public/ProposalPdfModal.tsx`
- Test: `tests/proposal-page.test.tsx`

**Interfaces:**
- Consumes: `getAllProposals()`, `getProposalBySlug()` dari `src/lib/proposal.ts`
- Produces: Halaman daftar proposal dengan progress donasi, tombol unduh PDF resmi, modal pratinjau PDF, dan halaman rincian detail proposal.

- [ ] **Step 1: Tulis test halaman `/proposal` dan `/proposal/[slug]`**
- [ ] **Step 2: Implementasikan `ProposalCard.tsx` dengan progress dana terkumpul vs target RAB dan tombol unduh PDF**
- [ ] **Step 3: Implementasikan modal pratinjau PDF `ProposalPdfModal.tsx`**
- [ ] **Step 4: Implementasikan halaman daftar `src/app/(public)/proposal/page.tsx`**
- [ ] **Step 5: Implementasikan halaman rincian `src/app/(public)/proposal/[slug]/page.tsx`**
- [ ] **Step 6: Jalankan test dan pastikan lulus**
- [ ] **Step 7: Git commit halaman proposal**

---

### Task 6: Seksi Cuplikan Proposal Terbuka di Homepage

**Files:**
- Create: `src/components/public/FeaturedProposalSection.tsx`
- Modify: `src/app/(public)/page.tsx`
- Test: `tests/featured-proposal-section.test.tsx`

**Interfaces:**
- Consumes: `getAllProposals({ featuredOnly: true })`
- Produces: Seksi cuplikan di beranda yang menampilkan 2–3 proposal unggulan/prioritas dengan progress dana dan tombol aksi cepat.

- [ ] **Step 1: Tulis test untuk `FeaturedProposalSection`**
- [ ] **Step 2: Implementasikan `src/components/public/FeaturedProposalSection.tsx`**
- [ ] **Step 3: Pasang `FeaturedProposalSection` pada `src/app/(public)/page.tsx`**
- [ ] **Step 4: Jalankan test dan pastikan lulus**
- [ ] **Step 5: Git commit cuplikan homepage**

---

### Task 7: Dashboard Admin Pengelolaan Program Kerja

**Files:**
- Create: `src/app/admin/(dashboard)/program/page.tsx`
- Create: `src/app/admin/(dashboard)/program/ProgramAdminClient.tsx`
- Create: `src/app/admin/(dashboard)/program/actions.ts`
- Test: `tests/admin-program.test.tsx`

**Interfaces:**
- Produces: Halaman admin `/admin/program` untuk menambah, mengedit (termasuk slider progress cepat 0-100%), dan menghapus program kerja.

- [ ] **Step 1: Tulis test server action dan halaman admin program**
- [ ] **Step 2: Implementasikan Server Actions `actions.ts` untuk CRUD Program**
- [ ] **Step 3: Implementasikan `ProgramAdminClient.tsx` (tabel data, filter, modal form input, quick progress slider)**
- [ ] **Step 4: Implementasikan `src/app/admin/(dashboard)/program/page.tsx`**
- [ ] **Step 5: Jalankan test dan pastikan lulus**
- [ ] **Step 6: Git commit admin program kerja**

---

### Task 8: Dashboard Admin Pengelolaan Proposal Terbuka & Sidebar

**Files:**
- Create: `src/app/admin/(dashboard)/proposal/page.tsx`
- Create: `src/app/admin/(dashboard)/proposal/ProposalAdminClient.tsx`
- Create: `src/app/admin/(dashboard)/proposal/actions.ts`
- Modify: `src/components/admin/Sidebar.tsx` (atau navigasi admin)
- Test: `tests/admin-proposal.test.tsx`

**Interfaces:**
- Produces: Halaman admin `/admin/proposal` untuk mengunggah file PDF proposal, mengaitkan kategori kas, mengatur target RAB, toggle cuplikan di beranda, serta pembaruan menu sidebar admin.

- [ ] **Step 1: Tulis test server action dan antarmuka admin proposal**
- [ ] **Step 2: Implementasikan Server Actions `actions.ts` untuk CRUD Proposal dan upload berkas PDF**
- [ ] **Step 3: Implementasikan `ProposalAdminClient.tsx` (tabel proposal, modal form, upload file PDF, input target & nominal offline)**
- [ ] **Step 4: Perbarui navigasi sidebar admin di `Sidebar.tsx`**
- [ ] **Step 5: Jalankan test dan pastikan lulus**
- [ ] **Step 6: Git commit admin proposal & sidebar**

---

### Task 9: Verifikasi Penuh, Typecheck, dan Production Build

**Files:**
- All touched files

**Interfaces:**
- Produces: Sistem terverifikasi bebas error, lulus typecheck, lint, semua test suite, dan production build.

- [ ] **Step 1: Jalankan `npx tsc --noEmit` dan pastikan 0 error**
- [ ] **Step 2: Jalankan `npm run lint` dan pastikan 0 warning/error**
- [ ] **Step 3: Jalankan `npx vitest run` untuk seluruh test suite**
- [ ] **Step 4: Jalankan `npm run build` untuk memverifikasi kompilasi Next.js**
- [ ] **Step 5: Git push ke branch `main`**
