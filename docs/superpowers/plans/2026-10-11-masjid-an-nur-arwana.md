# Masjid An-Nur Arwana — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu aplikasi Next.js 15: website publik bertema Islami + dashboard admin (editor section, modul kas, donasi terverifikasi, RBAC 4 role, SEO, analitik).

**Architecture:** Monolit Next.js App Router. Publik ISR membaca Supabase Postgres via Prisma; `/admin` dilindungi middleware + `requireRole()` per Server Action; gambar via R2 presigned; jadwal sholat myquran + cache harian.

**Tech Stack:** Next.js 15 (TS), Prisma + Supabase Postgres, Auth.js v5 credentials, Tailwind CSS, Zod, Recharts, Vitest + Playwright, AWS S3 SDK (R2), next/og.

**Spec:** `docs/superpowers/specs/2026-10-11-masjid-an-nur-arwana-design.md`

## Global Constraints
- Bahasa UI **Indonesia**; rupiah format `id-ID` (`lib/format.ts formatRupiah`).
- Role enum: `ADMIN | BENDAHARA | KONTEN | VIEWER`.
- Saldo selalu agregat `SUM(MASUK)-SUM(KELUAR)` — tanpa kolom saldo redundan.
- Periode `DITUTUP` memblokir semua mutasi `Transaction`.
- Donasi `DIKONFIRMASI` membuat tepat 1 `Transaction(MASUK)` (`donationId @unique`), idempoten.
- Gambar hanya R2 presigned; tipe `jpg|png|webp` ≤ 5MB.
- **Semua tabel list admin WAJIB memakai `src/components/admin/DataTable.tsx`** (search debounce→URL, export CSV/Excel, print berkop, pagination server-side, sortable). Tidak ada tabel custom.
- Tracker tanpa cookie, hanya `{path, referrer}`.
- `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET`, `NEXT_PUBLIC_SITE_URL`, `GA4_MEASUREMENT_ID?`.

---

### Task 1: Scaffold proyek

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `vitest.config.ts`, `.env.example`, `.gitignore`

- [ ] **Step 1:** Init repo & scaffold
```bash
git init
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-import-alias --use-npm
npm i @prisma/client prisma bcryptjs zod next-auth@beta @auth/prisma-adapter @aws-sdk/client-s3 @aws-sdk/s3-request-presigner recharts
npm i -D vitest @vitejs/plugin-react playwright @playwright/test prisma-generator-tsconfig-paths
```
- [ ] **Step 2:** `vitest.config.ts` dengan alias `@/* → src/*`; script package: `"test": "vitest run"`, `"test:e2e": "playwright test"`.
- [ ] **Step 3:** `.env.example` berisi variabel Global Constraints; `npm run dev` → beranda render.
- [ ] **Step 4:** Commit `chore: scaffold next.js app`.

---

### Task 2: Skema Prisma + seed

**Files:**
- Create: `prisma/schema.prisma` (persis model di Spec §4), `prisma/seed.ts`

**Interfaces (dipakai task berikutnya):**
- `Role` enum export dari `@prisma/client`.
- Seed menghasilkan: user `admin@an-nur.local` (role ADMIN, password `Admin123!` via `bcrypt.hash`), 7 `Section` default (`hero,profil,jadwal,pengumuman,galeri,kontak,footer`, order 0..6, isVisible true), kategori: Infak(SMASUK), Sedekah(MASUK), Zakat(MASUK), Infaq Pembangunan(MASUK), Sosial(KELUAR), Operasional(KELUAR) — semua `type MASUK` untuk pemasukan, `KELUAR` untuk pengeluaran; `Period` "2026" (01-01→31-12, AKTIF); `Setting`: `site.name`, `site.address`, `site.phone`, `site.city` ("Arwana"), `donasi.rekening[]`, `seo.title`, `seo.description`, `kas.publicCategories`.

- [ ] **Step 1:** Tulis `schema.prisma` lengkap (enum + 11 model sesuai spec).
- [ ] **Step 2:** `npx prisma migrate dev --name init` → sukses.
- [ ] **Step 3:** Tulis `prisma/seed.ts` → `npx prisma db seed` → cek via `npx prisma studio`.
- [ ] **Step 4:** Commit `feat: prisma schema and seed`.

---

### Task 3: Util inti (db, rbac, format, settings)

**Files:**
- Create: `src/lib/db.ts`, `src/lib/rbac.ts`, `src/lib/format.ts`, `src/lib/settings.ts`
- Test: `tests/rbac.test.ts`, `tests/format.test.ts`

**Interfaces:**
```ts
// db.ts
export const db: PrismaClient
// rbac.ts
export type Action = 'manage_users'|'manage_settings'|'manage_sections'|'manage_articles'
  |'manage_transactions'|'verify_donations'|'view_analytics'
export function can(role: Role, action: Action): boolean
export async function requireRole(...roles: Role[]): Promise<SessionUser>  // throws if none
// format.ts
export function formatRupiah(n: number | string): string   // "Rp 1.234.500"
export function parseRupiah(s: string): number
export function formatDateID(d: Date): string              // "11 Okt 2026"
// settings.ts
export async function getSetting<T>(key: string, fallback: T): Promise<T>
export async function setSetting(key: string, value: unknown): Promise<void>
```

- [ ] **Step 1:** Tulis `tests/rbac.test.ts` — matriks: ADMIN semua true; BENDAHARA hanya `manage_transactions|verify_donations|view_analytics`; KONTEN hanya `manage_sections|manage_articles`; VIEWER hanya `view_analytics`.
- [ ] **Step 2:** Tulis `tests/format.test.ts` — `formatRupiah(1234500) === 'Rp 1.234.500'`, `parseRupiah('Rp 1.234.500') === 1234500`.
- [ ] **Step 3:** `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement ke-4 file → `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: core utils, rbac, settings`.

---

### Task 4: Standar DataTable (wajib)

**Files:**
- Create: `src/components/admin/DataTable.tsx`, `src/components/admin/PrintHeader.tsx`, `src/lib/table-query.ts`
- Test: `tests/dataTable.test.tsx`, `tests/table-query.test.ts`

**Interfaces:**
```ts
// table-query.ts
export interface TableParams { q: string; page: number; size: number; sort?: string; dir?: 'asc'|'desc' }
export function getTableParams(sp: Record<string, string | string[] | undefined>): TableParams
export function buildCsv(headers: string[], rows: (string|number)[][]): string  // BOM + ';' + numerik polos
// DataTable.tsx
export interface Column<T> { key: string; label: string; sortable?: boolean; align?: 'left'|'right'; render?: (row: T) => React.ReactNode }
export interface DataTableProps<T> {
  columns: Column<T>[]; data: T[]; total: number; page: number; pageSize: number;
  searchPlaceholder?: string; exportFilename?: string; toolbarExtra?: React.ReactNode;
  basePath: string;   // ex '/admin/kas/transaksi'
}
export function DataTable<T>(props: DataTableProps<T>): JSX.Element
```

- [ ] **Step 1:** Tulis `tests/table-query.test.ts`: `getTableParams` default `{q:'',page:1,size:20}`; clamp page ≥1, size ∈ {20,50,100}; `buildCsv` menghasilkan `"A;B\n1;2\n"` dengan prefix `\uFEFF`.
- [ ] **Step 2:** Tulis `tests/dataTable.test.tsx`: render 2 baris + "Menampilkan 1–2 dari 2"; search input ada; tombol Export & Print ada; pagination menampilkan total.
- [ ] **Step 3:** `npm test` → FAIL.
- [ ] **Step 4:** Implement:
  - `DataTable.tsx` — client component; toolbar (search debounce 400ms → `router.replace(?q=)`, dropdown Export [CSV via Blob download, Excel via `.xls` HTML table Blob], tombol Print → `window.print()`), thead sortable (link `?sort=&dir=`), tbody zebra + empty state, footer pagination (link `?page=`, prev/next, ukuran halaman select).
  - `PrintHeader.tsx` — hanya tampil `@media print`: logo/nama masjid, judul laporan, tanggal cetak.
  - `globals.css`: `@media print { .no-print{display:none!important} .print-only{display:block!important} }` + `.print-only{display:none}`.
- [ ] **Step 5:** `npm test` → PASS. Commit `feat: standard DataTable with search export print pagination`.

---

### Task 5: Auth.js + middleware + login

**Files:**
- Create: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`, `src/types/next-auth.d.ts`
- Modify: `src/app/layout.tsx` (SessionProvider bila perlu)

**Interfaces:**
```ts
// auth.ts
export const { auth, handlers, signIn, signOut } = NextAuth({...})
export interface SessionUser { id: string; name: string; role: Role }
// middleware.ts: matcher ['/admin/:path*'] → /admin/login publik, lainnya cek session → redirect /admin/login
// requireRole(Task 3) membaca session via auth()
```

- [ ] **Step 1:** Implement `auth.ts` (Credentials, jwt callback simpan `id/name/role`, `authorized` callback), `src/app/api/auth/[...nextauth]/route.ts`.
- [ ] **Step 2:** `requireRole` di `lib/rbac.ts` panggil `auth()`; tanpa session → `redirect('/admin/login')`; role tak cocok → throw `Error('Akses ditolak')`.
- [ ] **Step 3:** Login page + server action (`signIn` credentials, error inline "Email atau password salah").
- [ ] **Step 4:** Test manual: `npm run dev` → `/admin` redirect login → login `admin@an-nur.local`/`Admin123!` → dashboard shell.
- [ ] **Step 5:** Commit `feat: auth.js credentials and admin middleware`.

---

### Task 6: Shell admin (sidebar + dashboard placeholder)

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/components/admin/Sidebar.tsx`, `src/components/admin/LogoutButton.tsx`

- [ ] **Step 1:** Layout admin: sidebar nav (Ringkasan, Sections, Artikel, Kas ▾ [Transaksi, Kategori, Periode, Laporan], Donasi, Pengguna, Analitik, Pengaturan) + area konten + tombol Keluar (`signOut`).
- [ ] **Step 2:** Sembunyikan menu sesuai `can(role, action)` (import dari `lib/rbac`).
- [ ] **Step 3:** `/admin/page.tsx` placeholder "Dashboard".
- [ ] **Step 4:** Commit `feat: admin shell and sidebar`.

---

### Task 7: Upload R2 + ImageField

**Files:**
- Create: `src/lib/r2.ts`, `src/app/api/upload/route.ts`, `src/components/admin/ImageField.tsx`

**Interfaces:**
```ts
// r2.ts
export async function getPresignedPutUrl(key: string, contentType: string): Promise<string>
export function publicUrl(key: string): string   // https://pub-<r2>.r2.dev/<key> atau custom domain
// POST /api/upload { filename, contentType } → { uploadUrl, publicUrl } ; 401 tanpa session; 400 tipe di luar jpg/png/webp
```

- [ ] **Step 1:** `lib/r2.ts` dengan S3 client (endpoint R2, `forcePathStyle`), `getPresignedPutUrl`.
- [ ] **Step 2:** Route API dengan `auth()` guard + validasi tipe/ukuran filename.
- [ ] **Step 3:** `ImageField` client: pilih file → `fetch('/api/upload')` → PUT ke `uploadUrl` → set value URL publik → preview.
- [ ] **Step 4:** Test manual + commit `feat: r2 presigned upload`.

---

### Task 8: Editor Sections

**Files:**
- Create: `src/app/admin/sections/page.tsx`, `src/app/admin/sections/actions.ts`, `src/app/admin/sections/SectionForm.tsx`
- Test: `tests/sections.test.ts` (action gate)

**Interfaces:**
```ts
// actions.ts — semua requireRole('ADMIN','KONTEN')
export async function updateSection(id: string, title: string, content: unknown): Promise<{ok:boolean; error?:string}>
export async function toggleSection(id: string, visible: boolean): Promise<void>
export async function reorderSections(orderedIds: string[]): Promise<void>  // update order by index
// setelah sukses: revalidatePath('/')
```

- [ ] **Step 1:** Test: mock `requireRole` VIEWER → `updateSection` throw.
- [ ] **Step 2:** Page memakai **DataTable**: kolom Section (title), Status (toggle switch), Urutan (▲▼ buttons), Aksi (Edit link). `basePath="/admin/sections"`.
- [ ] **Step 3:** `SectionForm` per key: hero (judul, subjudul, imageUrl via ImageField, ctaLabel, ctaHref), profil (textarea panjang), kontak (alamat, telp, email, jam, mapEmbed), footer (teks, social Json), lainnya (title + Json editor textarea).
- [ ] **Step 4:** Test pass + `revalidatePath` terpanggil → commit `feat: section manager`.

---

### Task 9: Halaman publik (beranda + section renderer)

**Files:**
- Create: `src/app/(public)/layout.tsx`, `src/app/(public)/page.tsx`, `src/components/public/SectionRenderer.tsx`, `src/components/public/Hero.tsx`, `src/components/public/Footer.tsx`, `src/components/public/Tracker.tsx`
- Modify: `src/app/globals.css` (palette, font, pattern)

**Interfaces:**
```ts
// SectionRenderer
export function SectionRenderer({ sections }: { sections: Section[] }): JSX.Element
// per key: hero → <Hero/>, profil → prose, kontak → contact card, galeri → grid, footer → <Footer/>
```

- [ ] **Step 1:** `globals.css`: CSS vars `--hijau:#0F4C3A; --emas:#C9A227; --krem:#FAF7F0`, font Amiri + Plus Jakarta Sans via `next/font/google` di root layout, pattern SVG background utility.
- [ ] **Step 2:** `(public)/layout.tsx`: header (logo nama masjid dari Setting, nav: Beranda, Profil, Berita, Galeri, Laporan Kas, Donasi, Kontak), `<Tracker/>`.
- [ ] **Step 3:** Beranda: ambil `db.section.findMany({where:{isVisible:true}, orderBy:{order:'asc'}})` → `<SectionRenderer/>` + strip artikel terbaru (3) + strip saldo publik (placeholder sampai Task 14) + `<PrayerSchedule/>` placeholder.
- [ ] **Step 4:** `revalidate = 60`. Verifikasi visual. Commit `feat: public layout and section renderer`.

---

### Task 10: Halaman publik lain

**Files:**
- Create: `src/app/(public)/profil/page.tsx`, `galeri/page.tsx`, `kontak/page.tsx`, `kegiatan/page.tsx`, `src/components/public/MapEmbed.tsx`

- [ ] **Step 1:** Profil dari section `profil` + Setting; Galeri grid dari section `galeri` (Json list url+caption); Kontak card + `MapEmbed` (iframe OpenStreetMap dari Setting `site.mapQuery`); Kegiatan list artikel PUBLISHED (pagination DataTable publik opsional → cukup link).
- [ ] **Step 2:** Commit `feat: public profile gallery contact news pages`.

---

### Task 11: CRUD Artikel

**Files:**
- Create: `src/app/admin/artikel/page.tsx`, `actions.ts`, `src/app/admin/artikel/ArticleForm.tsx`, `src/lib/slug.ts`
- Test: `tests/slug.test.ts`, `tests/articles-gate.test.ts`

**Interfaces:**
```ts
// slug.ts
export function slugify(title: string): string
export async function uniqueSlug(base: string, excludeId?: string): Promise<string>
// actions.ts — requireRole('ADMIN','KONTEN')
export async function saveArticle(input: ArticleInput): Promise<{ok:true; slug:string} | {ok:false; error:string}>
export async function deleteArticle(id: string): Promise<void>
export async function publishArticle(id: string, publish: boolean): Promise<void>
```

- [ ] **Step 1:** Test `slugify('Pengajian Rutin Mingguan!') === 'pengajian-rutin-mingguan'`; `uniqueSlug` hindari duplikat (append `-2`).
- [ ] **Step 2:** Test gate VIEWER ditolak.
- [ ] **Step 3:** Page DataTable (kolom: Judul, Kategori, Status badge, Views, Tanggal, Aksi) + search `q` (judul/excerpt `contains: insensitive`), sort `createdAt`.
- [ ] **Step 4:** Form: judul, slug auto, excerpt, cover ImageField, body textarea, kategori select, status, seoTitle/seoDescription/seoImage.
- [ ] **Step 5:** Test pass → commit `feat: article crud`.

---

### Task 12: Halaman artikel publik + SEO infra

**Files:**
- Create: `src/lib/seo.ts`, `src/app/(public)/berita/page.tsx`, `src/app/(public)/berita/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`, `src/app/(public)/berita/[slug]/opengraph-image.tsx`
- Test: `tests/seo.test.ts`

**Interfaces:**
```ts
// seo.ts
export function buildMetadata(o: { title?: string; description?: string; image?: string; path: string; type?: 'website'|'article' }): Metadata
export function articleLd(a: Article): Record<string, unknown>
export function orgLd(site: { name: string; address: string; phone: string }): Record<string, unknown>
```

- [ ] **Step 1:** Test `buildMetadata` → canonical `${SITE_URL}${path}`, OG title fallback ke site title.
- [ ] **Step 2:`(public)/berita/[slug]`: `notFound()` bila DRAFT; `generateMetadata` pakai seo override; JSON-LD `Article` + `BreadcrumbList`; increment `viewCount`.
- [ ] **Step 3:** `sitemap.ts` (static paths + artikel published), `robots.ts` (allow `/`, disallow `/admin`, `/api`), `opengraph-image.tsx` (next/og, warna hijau/emas, nama masjid).
- [ ] **Step 4:** `npm run build` sukses → commit `feat: article pages and seo`.

---

### Task 13: Kategori & Periode kas

**Files:**
- Create: `src/app/admin/kas/kategori/{page.tsx,actions.ts}`, `src/app/admin/kas/periode/{page.tsx,actions.ts}`
- Test: `tests/period-lock.test.ts`

**Interfaces:**
```ts
// kategori: requireRole('ADMIN','BENDAHARA')
export async function saveCategory(i: {id?:string; name:string; type:'MASUK'|'KELUAR'; color?:string; isActive:boolean}): Promise<void>
export async function deleteCategory(id: string): Promise<void>  // gagal jika dipakai transaksi → error message
// periode
export async function openPeriod(name: string): Promise<void>   // tanggal 1 Jan–31 Des tahun `name`, cegah duplikat
export async function closePeriod(id: string): Promise<{ok:boolean; error?:string}> // status DITUTUP, closedAt/By
```

- [ ] **Step 1:** Test `closePeriod` mengubah status; `openPeriod('2026')` duplikat → error.
- [ ] **Step 2:** Kategori page DataTable (Nama, Jenis badge, Status, Aksi) + form dialog.
- [ ] **Step 3:** Periode page DataTable (Nama, Rentang, Status, Ditutup oleh/tgl, Aksi) + dialog konfirmasi tutup.
- [ ] **Step 4:** Commit `feat: kas categories and periods`.

---

### Task 14: Transaksi Kas

**Files:**
- Create: `src/app/admin/kas/transaksi/{page.tsx,actions.ts,TransactionForm.tsx}`, `src/lib/kas.ts`
- Test: `tests/kas.test.ts`

**Interfaces:**
```ts
// kas.ts
export async function getPeriodBalance(periodId: string): Promise<{masuk:number; keluar:number; saldo:number}>
export async function getActivePeriod(): Promise<Period>
export async function listTransactions(p: TableParams & { type?: string; categoryId?: string; from?: string; to?: string }):
  Promise<{ rows: TransactionWithCat[]; total: number }>
// actions.ts — requireRole('ADMIN','BENDAHARA'); cek periode AKTIF sebelum mutasi
export async function createTransaction(i: TxInput): Promise<{ok:boolean; error?:string}>
export async function updateTransaction(id: string, i: TxInput): Promise<{ok:boolean; error?:string}>
export async function deleteTransaction(id: string): Promise<{ok:boolean; error?:string}>
```

- [ ] **Step 1:** Test: saldo agregat fixture (3 masuk, 2 keluar → benar); `createTransaction` pada periode DITUTUP → `{ok:false, error:'Periode sudah ditutup'}`.
- [ ] **Step 2:** Page: kartu ringkasan (Total Masuk, Total Keluar, Saldo periode aktif) + **DataTable** (Tanggal, Jenis badge, Kategori, Keterangan, Nominal right-align, Aksi) dengan filter `type`, `categoryId`, `from/to`, `q`.
- [ ] **Step 3:** Form dialog (Zod: amount > 0, date required) + `exportFilename="transaksi-kas"`.
- [ ] **Step 4:** Test pass → commit `feat: kas transactions`.

---

### Task 15: Laporan & export kas

**Files:**
- Create: `src/lib/report.ts`, `src/app/admin/kas/laporan/page.tsx`, `src/app/admin/kas/laporan/actions.ts`
- Test: `tests/report.test.ts`

**Interfaces:**
```ts
// report.ts
export async function buildKasReport(opts: { periodId: string; categoryId?: string }):
  Promise<{ title: string; periodLabel: string; rows: {kategori:string; masuk:number; keluar:number; saldo:number}[]; total:{masuk:number; keluar:number; saldo:number} }>
export function reportToCsv(r: Awaited<ReturnType<typeof buildKasReport>>): string
// actions.ts export ke peran ADMIN|BENDAHARA → return { filename, content, mime }
```

- [ ] **Step 1:** Test `reportToCsv`: header `Kategori;Masuk;Keluar;Saldo` + BOM; total = jumlah baris.
- [ ] **Step 2:** Page laporan: filter periode/kategori → ringkasan per kategori + total; toolbar DataTable `toolbarExtra` berisi tombol Ekspor CSV, Ekspor Excel, Cetak (PrintHeader judul "LAPORAN KEUANGAN MASJID" + periode).
- [ ] **Step 3:** Test pass → commit `feat: kas report csv excel print`.

---

### Task 16: Form donasi publik + API

**Files:**
- Create: `src/app/(public)/donasi/page.tsx`, `src/app/(public)/donasi/actions.ts`, `src/app/(public)/donasi/status/page.tsx`, `src/app/api/donasi/route.ts`, `src/lib/rate-limit.ts`
- Test: `tests/donasi-api.test.ts`

**Interfaces:**
```ts
// POST /api/donasi  body: {donorName, amount, categoryId?, message?, proofImage?}
//   → { ok, reference }  | 400 invalid  | 429 rate-limit (lib/rate-limit in-memory 5/menit/IP)
// status page: ?ref=REFERENCE → tampil status MENUNGGU/DIKONFIRMASI/DITOLAK + catatan tolak
```

- [ ] **Step 1:** `lib/rate-limit.ts` (`hit(key, limit, windowMs)` → boolean).
- [ ] **Step 2:** Test route: payload tidak valid → 400; valid → 200 + `reference` unik (`prefix + random`); 6 request → 429.
- [ ] **Step 3:** Page donasi: kartu rekening (Setting `donasi.rekening`), form + upload bukti (presigned publik-terbatas: gunakan route upload dengan validasi file saja), pesan sukses + link status.
- [ ] **Step 4:** Commit `feat: donation form and api`.

---

### Task 17: Verifikasi donasi admin

**Files:**
- Create: `src/app/admin/donasi/{page.tsx,actions.ts}`
- Test: `tests/donasi-verify.test.ts`

**Interfaces:**
```ts
// requireRole('ADMIN','BENDAHARA')
export async function verifyDonation(id: string, decision: 'confirm'|'reject', note?: string):
  Promise<{ok:boolean; error?:string}>
// confirm: transaksi dalam $transaction — status DIKONFIRMASI + create Transaction{MASUK, donationId, periode AKTIF, kategori donasi/default Setting}
// reject: status DITOLAK + rejectNote. Idempoten: status != MENUNGGU → {ok:false,error:'Sudah diproses'}
```

- [ ] **Step 1:** Test: confirm → 1 Donation + 1 Transaction, saldo naik `amount`; confirm dua kali → error kedua; reject → DITOLAK + tanpa transaksi.
- [ ] **Step 2:** Page: kartu antrian (Menunggu/Dikonfirmasi/Ditolak) + **DataTable** (Tanggal, Donatur, Jumlah, Status, Aksi [Konfirmasi dialog / Tolak + catatan]) filter status + `q`.
- [ ] **Step 3:** Test pass → commit `feat: donation verification`.

---

### Task 18: Jadwal sholat myquran

**Files:**
- Create: `src/lib/praytime.ts`, `src/components/public/PrayerSchedule.tsx`, `src/app/api/praytime/route.ts`
- Test: `tests/praytime.test.ts` (fixture JSON myquran)

**Interfaces:**
```ts
// praytime.ts
export async function getPrayerTimes(city: string, date?: Date): Promise<Record<'imsak'|'subuh'|'dzuhur'|'ashar'|'maghrib'|'isya', string>>
export function nextPrayer(times: Record<string,string>, now: Date): { name: string; at: Date }
// cache: PrayerTimeCache key `${date}-${city}`
```

- [ ] **Step 1:** Test parse fixture myquran → jam benar; `nextPrayer` setelah Isya → subuh besok.
- [ ] **Step 2:** `PrayerSchedule` client: daftar 6 waktu, highlight berikutnya, countdown `HH:MM:SS`, badge "hari ini", kota dari Setting; ambil via `/api/praytime`.
- [ ] **Step 3:** Pasang di beranda → commit `feat: prayer times myquran`.

---

### Task 19: Tracker + analitik page

**Files:**
- Create: `src/app/api/track/route.ts`, pasang `Tracker` di `(public)/layout.tsx`, `src/app/admin/analitik/page.tsx`, `src/lib/analytics.ts`
- Test: `tests/analytics.test.ts`

**Interfaces:**
```ts
// POST /api/track {path, referrer?} → 204; rate-limit; hanya simpan path+referrer
// analytics.ts
export function dailyPageviews(days: number): Promise<{date:string; views:number}[]>
export function topPages(days: number, limit: number)
export function topReferrers(days: number, limit: number)
export function hourlyViews(days: number)
```

- [ ] **Step 1:** Test agregat fixture (dates → jumlah benar).
- [ ] **Step 2:** `Tracker`: `useEffect` → `navigator.sendBeacon('/api/track', JSON.stringify({path:location.pathname, referrer:document.referrer}))`.
- [ ] **Step 3:** `/admin/analitik`: Recharts AreaChart pageview 7/30 hari + DataTable halaman terpopuler + referrer + bar jam ramai + **grafik kas** (LineChart masuk/keluar 6 bulan dari `analytics.ts kasMonthly()`).
- [ ] **Step 4:** Commit `feat: analytics tracker and dashboard`.

---

### Task 20: Pengguna + Pengaturan + GA4

**Files:**
- Create: `src/app/admin/pengguna/{page.tsx,actions.ts}`, `src/app/admin/pengaturan/{page.tsx,actions.ts}`, `src/app/admin/page.tsx` (dashboard final), modify `(public)/layout.tsx` (GA4 script)

**Interfaces:**
```ts
// pengguna — requireRole('ADMIN')
export async function saveUser(i: {id?:string; name:string; email:string; role:Role; password?:string; isActive:boolean}):
  Promise<{ok:boolean; error?:string}>  // cegah nonaktifkan diri sendiri; email unik
// pengaturan — requireRole('ADMIN'); upsert Setting keys per grup form
```

- [ ] **Step 1:** Pengguna page: **DataTable** (Nama, Email, Role select inline, Status, Aksi) + form create/edit (password kosong = tidak diubah).
- [ ] **Step 2:** Pengaturan: form grup (Identitas, Lokasi & Sholat, Rekening Donasi, SEO Global, GA4) → `setSetting`.
- [ ] **Step 3:** GA4: di `(public)/layout.tsx` `getSetting('ga4.id','')` bila ada → `<Script strategy="afterInteractive">` gtag.
- [ ] **Step 4:** Dashboard `/admin/page.tsx`: kartu Saldo hari ini, Donasi menunggu, Pageview 7 hari, Artikel draft + tabel transaksi terbaru (DataTable) + chart mini.
- [ ] **Step 5:** Commit `feat: users settings ga4 and dashboard`.

---

### Task 21: Laporan kas publik

**Files:**
- Create: `src/app/(public)/laporan-kas/page.tsx`

- [ ] **Step 1:** Periode AKTIF → tabel ringkasan per kategori yang ada di `Setting.kas.publicCategories` (kolom Kategori, Masuk, Keluar, Saldo) + tanggal update; **DataTable publik** dengan pagination bila baris banyak, tanpa export/print pribadi (atau biarkan print umum).
- [ ] **Step 2:** Disclaimer transparansi + link donasi. Commit `feat: public kas report`.

---

### Task 22: Kualitas — lint, build, unit, E2E, SEO

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1:** `npm run lint` bersih; `npm test` semua hijau; `npm run build` sukses.
- [ ] **Step 2:** Playwright smoke:
  - beranda → klik Berita → buka artikel pertama → assert h1;
  - `/donasi` isi form valid → sukses + reference tampil;
  - `/admin/login` → `admin@an-nur.local` → dashboard → buka Sections → toggle → assert; buka Kas → tambah transaksi → muncul di tabel; Donasi → konfirmasi (fixture via API).
- [ ] **Step 3:** `npx lighthouse ${NEXT_PUBLIC_SITE_URL} --only-categories=seo,performance,best-practices --output=json` → catat skor; perbaiki metadata bila < 90.
- [ ] **Step 4:** Commit `test: unit, e2e smoke, seo audit`.

---

### Task 23: Deploy

- [ ] **Step 1:** Supabase project → `DATABASE_URL` (pooled) → `npx prisma migrate deploy && npx prisma db seed`.
- [ ] **Step 2:** R2 bucket + CORS (origin Vercel, PUT) → env keys.
- [ ] **Step 3:** Push GitHub → Vercel import → set env (`DATABASE_URL`, `AUTH_SECRET`, `R2_*`, `NEXT_PUBLIC_SITE_URL`, `GA4_MEASUREMENT_ID?`) → deploy.
- [ ] **Step 4:** Verifikasi live: beranda, artikel terindex `sitemap.xml`, login admin, alur kas & donasi penuh.

## Self-Review (spec coverage)
- Section editor → Task 8; Publik pages → 9,10,21; Artikel+SEO → 11,12; Kas → 13,14,15; Donasi → 16,17; Sholat → 18; Analitik → 19,20; Users/Settings/GA4 → 20; RBAC → 3,5; DataTable standar → 4 (dipakai 8,11,13,14,15,17,19,20,21); Testing/deploy → 22,23. Tanpa placeholder TBD.
