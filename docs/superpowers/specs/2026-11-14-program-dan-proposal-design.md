# Spesifikasi Desain: Pengelolaan Program Kerja & Proposal Terbuka

## 1. Latar Belakang & Tujuan
Masjid An-nuur Arwana membutuhkan sistem pengelolaan dan publikasi terstruktur untuk:
1. **Program Kerja DKM**: Mempublikasikan rencana kerja jangka pendek (tahunan) dan jangka panjang (strategis/fisik) beserta persentase progress capaian nyata agar transparan kepada jamaah.
2. **Proposal Terbuka (Open Proposal)**: Membuka penggalangan partisipasi dana dan sarana untuk proyek-proyek khusus masjid yang membutuhkan dokumen proposal resmi (PDF), target anggaran biaya (RAB), dan pencapaian donasi yang akuntabel.
3. **Navigasi Terintegrasi**: Mengelompokkan menu *Agenda Kegiatan*, *Program Kerja*, dan *Proposal Terbuka* ke dalam satu grup dropdown modern di navigasi utama (`PublicHeader`).
4. **Cuplikan di Beranda**: Menampilkan proposal terbuka prioritas/unggulan di Homepage untuk meningkatkan atensi dan partisipasi jamaah.
5. **Dashboard Admin**: Pengurus DKM dapat mengelola program kerja (update progress slider) dan proposal (upload file PDF, atur target dana, dan toggle tampil di homepage) dengan mudah.

---

## 2. Struktur Navigasi Publik

Pada `src/components/public/nav.ts`, menu `Kegiatan & Program` diubah menjadi menu dropdown dengan rincian sub-menu:

```ts
{
  label: 'Kegiatan & Program',
  children: [
    {
      label: 'Agenda Kegiatan',
      href: '/kegiatan',
      description: 'Jadwal kajian, pengajian rutin, dan agenda keumatan',
    },
    {
      label: 'Program Kerja',
      href: '/program',
      description: 'Rencana kerja jangka pendek & panjang beserta capaian',
    },
    {
      label: 'Proposal Terbuka',
      href: '/proposal',
      description: 'Peluang amal jariyah, target RAB, & unduh proposal resmi',
    },
  ],
}
```

---

## 3. Skema Data (Prisma Schema)

### A. Enum
- `ProgramPeriodType`: `PENDEK` (Jangka Pendek), `PANJANG` (Jangka Panjang)
- `ProgramCategory`: `IDARAH` (Manajemen/Sekretariat), `IMARAH` (Ibadah/Dakwah), `RIAYAH` (Sarana/Pembangunan), `SOSIAL` (Sosial/Umat)
- `ProgramStatus`: `DIRENCANAKAN`, `BERJALAN`, `SELESAI`, `DITUNDA`
- `ProposalStatus`: `DRAFT`, `DIBUKA`, `TERPENUHI`, `SELESAI`

### B. Model `Program`
```prisma
model Program {
  id             String            @id @default(cuid())
  title          String
  slug           String            @unique
  description    String
  periodType     ProgramPeriodType @default(PENDEK)
  category       ProgramCategory   @default(IMARAH)
  status         ProgramStatus     @default(DIRENCANAKAN)
  progress       Int               @default(0) // 0 - 100
  targetDate     DateTime?
  budgetEstimate Decimal?          @db.Decimal(18, 2)
  picName        String?
  picPhone       String?
  order          Int               @default(0)
  isFeatured     Boolean           @default(false)
  proposals      Proposal[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([periodType, status])
}
```

### C. Model `Proposal`
```prisma
model Proposal {
  id              String         @id @default(cuid())
  title           String
  slug            String         @unique
  summary         String
  description     String
  coverImage      String?
  filePdf         String?        // URL/Path dokumen PDF proposal
  filePdfSize     String?        // Ukuran file, misal "2.4 MB"
  targetAmount    Decimal        @db.Decimal(18, 2)
  collectedManual Decimal        @default(0) @db.Decimal(18, 2) // Donasi tunai / offline
  categoryId      String?        // Relasi ke Category kas DKM
  category        Category?      @relation(fields: [categoryId], references: [id])
  programId       String?        // Opsional relasi ke Program kerja
  program         Program?       @relation(fields: [programId], references: [id])
  startDate       DateTime?
  endDate         DateTime?
  status          ProposalStatus @default(DIBUKA)
  isFeatured      Boolean        @default(false) // Ditampilkan di homepage
  picName         String?
  picPhone        String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([status, isFeatured])
}
```

---

## 4. Antarmuka Publik

### 4.1. Halaman Program Kerja (`/program`)
- **Header**: Judul Islami modern, penjelasan komitmen akuntabilitas program DKM.
- **Filter Tabs**:
  - `Semua Program`
  - `Jangka Pendek` (Program taktis bulanan/tahunan)
  - `Jangka Panjang` (Program strategis fisik/infrastruktur)
  - `Selesai`
- **Card Program**:
  - Badge Jangka Waktu (`Jangka Pendek` / `Jangka Panjang`) & Bidang.
  - Judul Program & Deskripsi.
  - Progress Bar Capaian Visual (0-100%).
  - Estimasi Anggaran & Target Tanggal Penyelesaian.
  - Penanggung Jawab (PIC).
  - Tautan *"📄 Partisipasi via Proposal Terbuka"* jika program memiliki proposal aktif.

### 4.2. Halaman Proposal Terbuka (`/proposal` & `/proposal/[slug]`)
- **Daftar Proposal (`/proposal`)**:
  - Card proposal dengan Progress Bar Dana:
    - `Terkumpul`: `(Donasi Online via Kategori Terkait) + (Donasi Offline/Manual)`.
    - `Target Anggaran (RAB)`.
    - `Sisa Hari / Tenggat Waktu`.
  - Tombol Aksi:
    - `📥 Unduh Proposal (PDF)`
    - `👁️ Pratinjau Proposal`
    - `💰 Salurkan Donasi / Patungan`
- **Detail Proposal (`/proposal/[slug]`)**:
  - Teks deskripsi lengkap dan kebutuhan sarpras/material.
  - Dokumen PDF embed viewer / tombol unduh.
  - Rekening donasi DKM & tombol konfirmasi donasi khusus proposal ini.
  - Kontak WhatsApp PIC proyek.

### 4.3. Cuplikan di Beranda (`Homepage Section`)
- Seksi khusus dengan nuansa hijau-emas Islami modern.
- Menampilkan hingga 3 proposal terbuka dengan status `isFeatured = true` (atau proposal aktif terbaru).
- Tampilan compact: Judul, Target & Dana Terkumpul, progress bar %, tombol unduh PDF, dan tombol *"Lihat Proposal Lengkap"*.

---

## 5. Dashboard Pengelolaan Admin

1. **Menu Program Kerja (`/admin/program`)**:
   - Data table daftar program.
   - Filter Jangka Pendek vs Panjang, status, kategori.
   - Modal Form Tambah & Edit Program (termasuk slider progress 0–100%).
   - Action Delete dengan konfirmasi.
2. **Menu Proposal Terbuka (`/admin/proposal`)**:
   - Data table daftar proposal.
   - Form Tambah & Edit Proposal:
     - Judul, ringkasan, deskripsi lengkap.
     - Upload Gambar Cover & Upload File PDF proposal (terkoneksi R2/lokal).
     - Target dana & input nominal terkumpul offline.
     - Dropdown Kategori Kas DKM (untuk auto-kalkulasi donasi online).
     - Switch Toggle: `Tampilkan di Beranda (Featured)`.
     - Nama & No WhatsApp PIC.
   - Action Delete dengan konfirmasi.
3. **Sidebar Navigasi Admin**:
   - Menambahkan icon dan menu `Program Kerja` dan `Proposal Terbuka`.

---

## 6. Verifikasi & Pengujian
- Unit & integration tests untuk query program dan kalkulasi dana proposal.
- Test rendering komponen dropdown navbar, halaman `/program`, `/proposal`, dan cuplikan homepage.
- Typecheck `tsc --noEmit`, ESLint, Vitest, dan Next.js production build.

