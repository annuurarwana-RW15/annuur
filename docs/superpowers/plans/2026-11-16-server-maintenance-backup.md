# Implementasi Fitur Pemantauan Server, Maintenance Mode, Backup & Restore Database

Rencana kerja implementasi modul manajemen server dan basis data pada `/admin/pengaturan/server` untuk Masjid An-nuur Arwana.

## Ringkasan Fitur
1. **Pemantauan Server (Diagnostics):**
   - Latensi ping PostgreSQL & status koneksi Prisma.
   - Ukuran total folder penyimpanan `public/uploads` dan jumlah berkas.
   - Runtime Node.js, RSS & Heap Memory, status lingkungan (`NODE_ENV`), dan Uptime server.
   - Tombol reload diagnostik real-time.
2. **Maintenance Mode:**
   - Saklar status pemeliharaan situs (tersimpan di `Setting` dengan key `system.maintenance`).
   - Kustomisasi judul, pesan jamaah, dan estimasi selesai.
   - Public view switcher: Mengalihkan pengunjung umum ke tampilan ramah jamaah dengan tombol WhatsApp darurat.
   - Bypass hak akses: Sesi role `ADMIN` tetap bisa menjelajah publik dan admin.
3. **Backup Database (JSON Snapshot):**
   - Endpoint export aman khusus `ADMIN` (`/api/admin/server/backup`).
   - Ekspor seluruh tabel Prisma beserta metadata skema, checksum, dan waktu pembuatan.
   - Langsung mengunduh file `.json` ke komputer lokal admin.
4. **Restore Database:**
   - Validasi berkas JSON (Dry-Run: cek tipe berkas, model yang didukung, jumlah baris).
   - Modal konfirmasi destruktif ganda dengan verifikasi kata kunci `PULIHKAN`.
   - Eksekusi restore aman berbasis `db.$transaction()` atomik dengan urutan dependensi foreign key.
5. **Navigasi & RBAC:**
   - Submenu di sidebar `src/components/admin/nav.ts` (`/admin/pengaturan/server`).
   - Kartu pintasan di `/admin/pengaturan`.
   - Proteksi ketat hanya role `ADMIN`.

---

## Pembagian Tugas (Bite-Sized Tasks)

### Task 1: Fondasi Library Server Diagnostics & Maintenance
- **Files:**
  - `src/lib/server-diagnostics.ts` (fungsi ping DB, cek ukuran `public/uploads`, memory & uptime)
  - `src/lib/maintenance.ts` (helper baca/tulis status maintenance di tabel `Setting`)
  - `tests/server-diagnostics.test.ts` (unit tests untuk server diagnostics & maintenance helper)
- **Verifikasi:** `npx vitest run tests/server-diagnostics.test.ts` lolos 100%.

### Task 2: Engine Backup & Restore Database (JSON Snapshot)
- **Files:**
  - `src/lib/database-backup.ts` (fungsi dump JSON seluruh tabel Prisma terurut dependensi)
  - `src/lib/database-restore.ts` (fungsi validasi dry-run JSON dan eksekusi transaksi atomik restore)
  - `src/app/api/admin/server/backup/route.ts` (endpoint stream download JSON untuk role ADMIN)
  - `tests/database-backup-restore.test.ts` (unit tests backup snapshot & dry-run validation)
- **Verifikasi:** `npx vitest run tests/database-backup-restore.test.ts` lolos 100%.

### Task 3: Middleware & Tampilan Publik Maintenance Mode
- **Files:**
  - `src/components/public/MaintenanceView.tsx` (komponen halaman pemeliharaan islami elegan dengan identitas masjid & kontak WA)
  - `src/app/(public)/layout.tsx` atau middleware check (pengecekan status maintenance + bypass admin)
  - `tests/maintenance-view.test.tsx` (unit test render maintenance page)
- **Verifikasi:** `npx vitest run tests/maintenance-view.test.tsx` lolos 100%.

### Task 4: Halaman Admin Server & Database (`/admin/pengaturan/server`)
- **Files:**
  - `src/app/admin/(dashboard)/pengaturan/server/page.tsx` (server component dengan requireRole('ADMIN'))
  - `src/app/admin/(dashboard)/pengaturan/server/ServerManagerClient.tsx` (client component kartu metrik diagnostik, form maintenance mode, tombol backup, dan modal upload restore dengan dry-run & double confirmation)
  - `src/app/admin/(dashboard)/pengaturan/server/actions.ts` (server actions untuk toggle maintenance, fetch fresh diagnostics, dan eksekusi restore)
  - `src/components/admin/nav.ts` (tambahkan menu 'Server & Database')
  - `src/app/admin/(dashboard)/pengaturan/page.tsx` & `PengaturanForm.tsx` (tambahkan kartu pintasan)
- **Verifikasi:** `npx vitest run tests/server-page.test.tsx`, `npx tsc --noEmit`, `npm run lint`.

### Task 5: Verifikasi Menyeluruh & Git Sync
- Jalankan seluruh suite test (`npx vitest run`), typecheck (`npx tsc --noEmit`), linter (`npm run lint`).
- Commit dan push ke `origin/main`.
- Berikan laporan hasil implementasi kepada pengguna.
