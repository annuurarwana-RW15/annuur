# Design Spec — Website & Dashboard DKM Masjid An-Nur Arwana

Tanggal: 2026-10-11
Status: Disetujui user

## 1. Ringkasan

Satu aplikasi Next.js 15 berisi:
- **Website publik** bertema Islami klasik-elegan: hero, profil, jadwal sholat, pengumuman/kegiatan, galeri, kontak, berita/artikel, laporan kas publik, donasi.
- **Dashboard admin** di `/admin`: editor section front end, modul kas (transaksi, kategori, periode/tutup buku, export), verifikasi donasi manual, manajemen pengguna/role, SEO, analitik.

## 2. Keputusan Stack

| Aspek | Keputusan |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | Supabase Postgres via Prisma |
| Auth | Auth.js v5 credentials + JWT (bcrypt), role di session |
| Styling | Tailwind CSS, font Amiri + Plus Jakarta Sans (next/font) |
| Gambar | Cloudflare R2 (presigned PUT), URL publik CDN |
| Jadwal sholat | API myquran.com, cache harian (`PrayerTimeCache`) |
| Donasi | Manual transfer + upload bukti → verifikasi admin |
| Analitik | Tracker bawaan (`page_views`, tanpa cookie) + opsional GA4 |
| Chart | Recharts |
| Testing | Vitest (unit/component) + Playwright (smoke E2E) |
| Hosting | Vercel (build) + Supabase (DB) + R2 (storage) |

## 3. Arsitektur

```
src/
├── app/
│   ├── (public)/            # ISR, publik
│   │   ├── page.tsx         # beranda (render sections)
│   │   ├── profil/, galeri/, kontak/, kegiatan/
│   │   ├── berita/, berita/[slug]/
│   │   ├── laporan-kas/, donasi/
│   │   └── layout.tsx       # header/footer + Tracker
│   ├── admin/               # RBAC-protected
│   │   ├── page.tsx         # ringkasan/dashboard
│   │   ├── login/
│   │   ├── sections/, artikel/, pengguna/
│   │   ├── kas/{transaksi,kategori,periode,laporan}/
│   │   ├── donasi/, analitik/, pengaturan/
│   ├── api/{track,upload,donasi}/
│   ├── sitemap.ts, robots.ts, opengraph-image.tsx
├── components/
│   ├── public/              # Hero, PrayerSchedule, SectionRenderer, Footer, Tracker
│   └── admin/               # DataTable (standar), sidebar, ImageField, charts
├── lib/                     # db, auth, rbac, format, r2, seo, praytime, settings, report
└── middleware.ts            # proteksi /admin/**
```

- Publik memakai ISR (`revalidate = 60`) + `revalidatePath('/')` setelah admin menyimpan konten.
- Semua state tabel admin ada di URL (`?q=&page=&size=&sort=&dir=`) agar shareable dan konsisten dengan print/export.

## 4. Skema Database (Prisma)

```prisma
enum Role        { ADMIN BENDAHARA KONTEN VIEWER }
enum TxType      { MASUK KELUAR }
enum CategoryType{ MASUK KELUAR }
enum PeriodStatus{ AKTIF DITUTUP }
enum ArticleStatus{ DRAFT PUBLISHED }
enum DonationStatus{ MENUNGGU DIKONFIRMASI DITOLAK }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(VIEWER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  transactions Transaction[]
  verifications Donation[]
}

model Section {
  id        String   @id @default(cuid())
  key       String   @unique   // hero|profil|jadwal|pengumuman|galeri|kontak|footer
  title     String
  content   Json                // teks/gambar/opsi fleksibel per key
  isVisible Boolean  @default(true)
  order     Int      @default(0)
  updatedAt DateTime @updatedAt
}

model Article {
  id             String        @id @default(cuid())
  title          String
  slug           String        @unique
  excerpt        String?
  coverImage     String?
  body           String        // markdown ringan
  category       String?
  status         ArticleStatus @default(DRAFT)
  seoTitle       String?
  seoDescription String?
  seoImage       String?
  viewCount      Int           @default(0)
  authorId       String
  author         User          @relation(fields: [authorId], references: [id])
  publishedAt    DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Category {
  id          String       @id @default(cuid())
  name        String
  type        CategoryType
  color       String?
  isActive    Boolean      @default(true)
  transactions Transaction[]
}

model Period {
  id        String       @id @default(cuid())
  name      String       @unique   // "2026"
  startDate DateTime
  endDate   DateTime
  status    PeriodStatus @default(AKTIF)
  closedAt  DateTime?
  closedBy  String?
  transactions Transaction[]
}

model Transaction {
  id          String    @id @default(cuid())
  type        TxType
  amount      Decimal   @db.Decimal(18,2)
  date        DateTime
  description String
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  periodId    String
  period      Period    @relation(fields: [periodId], references: [id])
  receiptImage String?
  createdBy   String
  creator     User      @relation(fields: [createdBy], references: [id])
  donationId  String?   @unique
  donation    Donation? @relation(fields: [donationId], references: [id])
  createdAt   DateTime  @default(now())
}

model Donation {
  id           String         @id @default(cuid())
  donorName    String
  amount       Decimal        @db.Decimal(18,2)
  categoryId   String?
  message      String?
  proofImage   String?
  reference    String         @unique  // kode referensi untuk cek status
  status       DonationStatus @default(MENUNGGU)
  rejectNote   String?
  verifiedById String?
  verifiedBy   User?          @relation(fields: [verifiedById], references: [id])
  verifiedAt   DateTime?
  createdAt    DateTime       @default(now())
  transaction  Transaction?
}

model PrayerTimeCache {
  date   String @id   // YYYY-MM-DD
  city   String
  times  Json
  fetchedAt DateTime @default(now())
}

model PageView {
  id       String   @id @default(cuid())
  path     String
  referrer String?
  viewedAt DateTime @default(now())
  @@index([viewedAt])
  @@index([path, viewedAt])
}

model Setting {
  key   String @id
  value Json
}
```

**Aturan integritas:**
- Saldo = agregat `SUM(MASUK) - SUM(KELUAR)` per periode (tidak ada kolom saldo redundan).
- `Period.status = DITUTUP` memblokir create/update/delete `Transaction` pada periode itu.
- Donasi `DIKONFIRMASI` wajib membuat tepat satu `Transaction(MASUK)` (`donationId` unique) pada periode aktif.
- Satu role per user; admin tidak boleh menonaktifkan akunnya sendiri.

## 5. Website Publik

- **Tema:** hijau tua `#0F4C3A`, emas `#C9A227`, krem `#FAF7F0`; ornamen geometri Islam SVG subtle; font Amiri (heading/aksen) + Plus Jakarta Sans (body).
- **Beranda:** Hero (section), Jadwal Sholat (highlight jadwal berikutnya + countdown), Profil singkat, Pengumuman/Kegiatan (artikel terbaru), Papan kas ringkas (saldo publik), Galeri, Kontak + peta (OpenStreetMap embed).
- **Halaman:** Profil, Galeri, Kontak, Kegiatan (list artikel), Berita/Artikel (`/[slug]`), Laporan Kas Publik (periode aktif, hanya kategori yang diizinkan `Setting.publicKasCategories`), Donasi (rekening dari Setting + form bukti).
- **Section renderer:** beranda membaca `Section` where `isVisible`, order by `order`, render per `key`.

## 6. Editor Section (Admin)

- `/admin/sections`: tabel standar DataTable — kolom Section, Status (toggle), Urutan (▲▼), Aksi (Edit).
- Form per key: `hero` (judul, subjudul, gambar, CTA), `profil` (teks panjang), `pengumuman` (judul + list artikel), `galeri` (grid gambar R2), `kontak` (alamat, telp, email, jam, embed peta), `footer` (teks, social links).
- Simpan → `revalidatePath('/')`.
- Role: `ADMIN`, `KONTEN`.

## 7. Standar DataTable (wajib semua tabel admin)

```tsx
interface DataTableProps<T> {
  columns: Column<T>[];       // { key, label, sortable?, align?, render? }
  data: T[];
  total: number;              // total setelah filter
  page: number; pageSize: number;   // default 20
  searchPlaceholder?: string;
  exportFilename?: string;
  toolbarExtra?: React.ReactNode;
}
```

Perilaku:
- **Header/toolbar:** search debounce 400ms → `?q=`, filter opsional, dropdown **Export** (CSV + Excel, hanya baris hasil filter), tombol **Print**, tombol aksi tambahan.
- **Thead sortable** → `?sort=key&dir=asc|desc`, sticky.
- **Footer/pagination** server-side: "Menampilkan 1–20 dari 143", tombol ‹ 1 2 3 … ›, selector ukuran halaman 20/50/100 → `?page=&size=`.
- **Print:** `@media print` sembunyikan sidebar/nav/tombol; tampilkan `PrintHeader` (kop masjid + judul + periode + tanggal cetak).
- **CSV:** UTF-8 BOM, delimiter `;`, kolom nominal numerik polos agar Excel id-ID rapi.
- **Empty state:** "Tidak ada data".
- Tabel yang memakai: sections, artikel, pengguna, kas/transaksi, kas/laporan, donasi, analitik (tabel), laporan kas publik (tanpa export pribadi, dengan pagination).

## 8. Modul Kas

- **Transaksi** (`/admin/kas/transaksi`): filter tanggal/jenis/kategori/q; form Zod (amount > 0, date, categoryId, description, receipt opsional); role `ADMIN|BENDAHARA`.
- **Kategori** (`/admin/kas/kategori`): CRUD, `type MASUK|KELUAR`, aktif/nonaktif.
- **Periode** (`/admin/kas/periode`): buka periode (otomatis tahunan), tutup (konfirmasi → `DITUTUP`, `closedAt/closedBy`).
- **Laporan** (`/admin/kas/laporan`): filter periode/kategori → tabel DataTable + **Export CSV/Excel** + **Print** berkop masjid.
- **Export lib** (`lib/report.ts`): generate rows agregat per kategori + total.

## 9. Donasi

- Publik `/donasi`: rekening tujuan (Setting), form (nama, jumlah, kategori, pesan, bukti upload R2), submit → `Donation(MENUNGGU)` + `reference` unik; halaman status via `?ref=`.
- `POST /api/donasi`: Zod + rate-limit in-memory (5/menit/IP).
- Admin `/admin/donasi`: antrier filter status; **Konfirmasi** → `DIKONFIRMASI` + buat `Transaction(MASUK)` (periode aktif, kategori terpilih, `donationId`); **Tolak** → `DITOLAK` + `rejectNote`. Idempoten: konfirmasi ulang ditolak.
- Role: `ADMIN|BENDAHARA`.

## 10. Auth & RBAC

| Aksi | ADMIN | BENDAHARA | KONTEN | VIEWER |
|---|---|---|---|---|
| Pengaturan/SEO/pengguna | ✅ | ❌ | ❌ | ❌ |
| Sections & artikel | ✅ | ❌ | ✅ | ❌ |
| Transaksi, kategori, periode, laporan, export | ✅ | ✅ | ❌ | ❌ |
| Verifikasi donasi | ✅ | ✅ | ❌ | ❌ |
| Analitik (read) | ✅ | ✅ | ❌ | ✅ |

- `middleware.ts`: semua `/admin/**` wajib session, kecuali `/admin/login`.
- Tiap Server Action panggil `requireRole(...)` (defense-in-depth).
- `lib/rbac.ts`: `can(role, action)` murni, diuji unit test.

## 11. SEO

- `lib/seo.ts buildMetadata()` — title/description/OG/canonical, override per artikel dari `seoTitle/seoDescription/seoImage`.
- `sitemap.ts` (artikel PUBLISHED + halaman statis), `robots.ts` (izinkan semua, larang `/admin`, `/api`).
- JSON-LD: `Organization` (masjid), `Article`, `BreadcrumbList`.
- `opengraph-image.tsx` (beranda) + OG dinamis artikel.
- ISR + image `alt` wajib + heading hierarchy → target Lighthouse SEO ≥ 90.
- `NEXT_PUBLIC_SITE_URL` wajib untuk canonical/sitemap.

## 12. Analitik

- `POST /api/track` — payload `{path, referrer}` dari `navigator.sendBeacon`, tanpa cookie/PII, rate-limit.
- `/admin/analitik`: pageview 7/30 hari (Recharts), halaman terpopuler, referrer, jam ramai; grafik kas (pemasukan/pengeluaran per bulan, saldo berjalan, top kategori).
- Pengaturan `GA4_MEASUREMENT_ID` → embed script hanya bila terisi.

## 13. Pengaturan

`/admin/pengaturan` menulis `Setting`: identitas masjid (nama, alamat, telp, logo), lokasi kota sholat, rekening donasi, kategori kas publik, SEO global (site title/description/OG), `GA4_MEASUREMENT_ID`.

## 14. Error & Keamanan

- Semua form: Zod validation, error inline via Server Action result.
- Upload: tipe `jpg|png|webp` ≤ 5 MB, hanya role terautentikasi untuk konten; bukti donasi lewat presigned terbatas.
- Rate-limit: login (Auth.js), API donasi & track (in-memory).
- `requireRole` di setiap aksi admin; middleware untuk halaman.

## 15. Testing & Kualitas

- **Vitest:** `rbac`, `format`, saldo agregat, blokir periode tutup, idempoten donasi, slug unik, parse praytime (fixture), DataTable render, export CSV.
- **Playwright smoke:** beranda → artikel → submit donasi; login admin → edit section → tambah transaksi → verifikasi donasi → export.
- **Gate:** `npm run lint`, `npm run build`, seluruh test hijau, Lighthouse SEO ≥ 90.

## 16. Cakupan & Non-Cakupan

**Termasuk:** semua fitur di atas.
**Tidak termasuk (YAGNI):** payment gateway online, multi-masjid/tenant, aplikasi mobile, notifikasi email/SMS, live chat, multi-bahasa, editor WYSIWYG berat (cukup textarea markdown ringan).
