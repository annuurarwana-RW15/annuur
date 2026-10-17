# Jurnal Kas dengan Saldo Berjalan — Desain

Tanggal: 2026-10-17
Status: Di-approve
Bagian dari: Sub-proyek B — Akuntabilitas kas internal

## 1. Latar & lingkup

Sistem kas saat ini menyimpan `Transaction` tanpa status approval, dan laporan
hanya menampilkan **agregat per kategori** (`/admin/kas/laporan`). Belum ada
tampilan **buku besar kronologis** yang menunjukkan bagaimana saldo bergerak
entri demi entri — yang dibutuhkan bendahara untuk menelusuri jejak kas.

**Lingkup sub-proyek ini (satu-satunya yang dibangun):** menambah **jurnal kas
dengan saldo berjalan** sebagai tab kedua di area laporan.

**Bukan lingkup (ditunda / sub-proyek lain):** approval dua orang (maker–checker),
rekonsiliasi kas fisik vs buku, laporan PDF bertanda tangan, audit trail immutable.

### Keputusan lingkup yang sudah di-approve

| Keputusan | Pilihan |
|---|---|
| Sifat jurnal | **Tampilan read-only** — tanpa migrasi schema; transaksi tetap bisa diubah/dihapus |
| Titik awal saldo | **Carry-forward** — saldo awal periode = saldo akhir periode sebelumnya |
| Penempatan | **Gabung di `/admin/kas/laporan`** sebagai tab |
| Search & filter | **Harus ada**, tetapi **tidak boleh mengubah saldo** |

## 2. Prinsip inti

> **Saldo adalah properti transaksi, bukan properti tampilan.**

Nilai kolom *Saldo* pada suatu baris = saldo kas **setelah transaksi itu
dibukukan** dalam buku besar kronologis **lengkap**. Search dan filter hanya
menyembunyikan baris; tidak pernah mengubah angka *Saldo* mana pun, termasuk
*Saldo Awal* dan *Saldo Akhir*.

## 3. Arsitektur & alur data

### 3.1 Penempatan: sub-route + tab nav

`DataTable` memakai nama param global (`q`, `page`, `size`, `sort`, `dir`) dan
dua `DataTable` pada URL yang sama akan berebut param tersebut. Karena itu
jurnal diberi **route sendiri**, meniru pola laporan publik yang sudah teruji:

- `/admin/kas/laporan` → tab **Rekap Kategori** (halaman yang ada, tidak diubah
  selain penambahan tab nav)
- `/admin/kas/laporan/jurnal` → tab **Jurnal** (baru)

`DataTable.tsx` **tidak dimodifikasi** — search box bawaannya memang dibutuhkan.

### 3.2 Urutan operasi (server)

```
1. Ambil SEMUA transaksi periode P, urut [date asc, createdAt asc, id asc]
   ← sumber kebenaran
2. Hitung saldoAwal (carry-forward) → saldo berjalan tiap baris   (INVARIAN)
3. Terapkan filter: kategori, jenis, rentang tanggal, search q  → subset tampil
4. Pagination atas subset (Saldo sudah benar, tidak dihitung ulang)
5. Kartu dihitung dari langkah 1–2 (seluruh periode)             (INVARIAN)
```

### 3.3 Perhitungan saldoAwal (carry-forward)

```
saldoAwal(P) = Σ masuk − Σ keluar  semua transaksi di periode
               dengan startDate < P.startDate
```

Dihitung dengan **satu** `groupBy(['type'])` pada `periodId IN (periode sebelum
P)` — bukan N query. Periode pertama yang pernah ada → `saldoAwal = 0`.

Pemilihan periode sebelumnya memakai `startDate` (bukan urutan abjad nama),
karena itu satu-satunya kunci kronologis yang tersedia di `Period`.

### 3.4 Saldo berjalan

```
saldo[0] = saldoAwal + (masuk[0] − keluar[0])
saldo[i] = saldo[i−1] + (masuk[i] − keluar[i])
```

*Saldo* = saldo **setelah** entri (semantik standar kolom saldo berjalan).

## 4. Invarian yang dijamin

| Nilai | Berubah saat filter aktif? |
|---|---|
| Kartu **Saldo Awal** | **Tidak** — hanya berubah saat ganti periode |
| Kartu **Saldo Akhir** | **Tidak** |
| Kartu **Total Masuk** / **Total Keluar** | **Tidak** (level periode) |
| Kolom **Saldo** tiap baris | **Tidak** |
| Kolom **No** (nomor urut) | **Tidak** |
| Persamaan `Saldo Akhir = Saldo Awal + Total Masuk − Total Keluar` | **Selalu benar** |
| `Saldo Akhir === entries.at(-1).saldo` | **Selalu benar** |

### Yang memang berubah saat filter aktif

- Baris yang tampil.
- Hint: **"Menampilkan X dari Y entri — Saldo dihitung dari seluruh buku besar"**.
- **Subtotal terfilter** (Masuk / Keluar khusus subset) — dilabeli jelas dan
  **tidak** menggantikan kartu. Ini yang menjawab "kenapa kartu tidak cocok
  dengan baris yang terlihat".

Kartu **sengaja tetap level periode** agar persamaan Saldo Akhir selalu utuh.
Subtotal terfilter disediakan secara terpisah untuk kebutuhan audit
("berapa pemasukan kategori X pada rentang Y").

## 5. Filter, pencarian, pengurutan

### 5.1 Filter (server-side, GET form)

| Param | Tipe | Keterangan |
|---|---|---|
| `period` | id | Dipilih dari dropdown, dipakai tab Rekap & Jurnal |
| `kategori` | id | Filter kategori |
| `jenis` | `MASUK` \| `KELUAR` | Filter jenis |
| `dari` | `YYYY-MM-DD` | Batas bawah tanggal transaksi |
| `sampai` | `YYYY-MM-DD` | Batas atas tanggal transaksi |
| `q` | teks | Pencarian — ditangani `DataTable` bawaan |

Pencarian `q` mencocokkan **deskripsi** dan **nama kategori**
(case-insensitive).

### 5.2 Pengurutan

Hanya kolom **Tanggal** yang sortable (asc/desc) melalui `?sort=tanggal&dir=`.

- Nilai *Saldo* **tidak dihitung ulang** saat sort — tetap saldo
  pasca-transaksi; hanya urutan baris yang berbalik.
- Kolom lain **tidak sortable**, agar kolom *Saldo* tetap terbaca runtut.
- Tie-break tanggal: `createdAt` lalu `id`, dan **tie-break ikut arah sort**
  (desc membalik semuanya, termasuk tie-break).
- Kolom `no` **tetap** menunjukkan posisi kronologis (1..N) apa pun arah
  tampilan — `no` adalah referensi buku besar, bukan nomor baris di layar.

## 6. Kolom jurnal

| Kolom | `key` | Sortable | Align | Render |
|---|---|---|---|---|
| No | `no` | tidak | right | Nomor urut 1..N di buku besar penuh (invarian) — dapat dirujuk saat audit |
| Tanggal | `tanggal` | **ya** | left | `toLocaleDateString('id-ID')` |
| Keterangan | `description` | tidak | left | Deskripsi transaksi |
| Kategori | `kategori` | tidak | left | Nama kategori |
| Jenis | `jenis` | tidak | left | "Masuk" (hijau) / "Keluar" (merah) |
| Masuk | `masuk` | tidak | right | `formatRupiah`, atau `—` bila 0 |
| Keluar | `keluar` | tidak | right | `formatRupiah`, atau `—` bila 0 |
| **Saldo** | `saldo` | tidak | right | `formatRupiah`, `font-semibold` |

## 7. Tampilan halaman

```
[Tabs: Rekap Kategori | Jurnal]
Jurnal Kas
{periodLabel} — dibuat {generatedAt}

[Filter: Periode | Kategori | Jenis | Dari | Sampai | Terapkan]

[Kartu: Saldo Awal | Total Masuk | Total Keluar | Saldo Akhir]   ← invarian

[Hint bila filter aktif]      "Menampilkan X dari Y entri — Saldo dihitung dari seluruh buku besar"
[Subtotal terfilter]          Masuk … · Keluar …

[JurnalTable: DataTable + toolbar Ekspor CSV / Ekspor Excel / Cetak]
```

Kartu **Saldo Awal** menampilkan saldo awal carry-forward dan label
"periode sebelumnya".

## 8. Ekspor & cetak

`exportJurnal(format, { periodId, filter })` — server action baru di
`kas/laporan/actions.ts`.

Meniru pola `LaporanTable` yang sudah ada: `hideBuiltinActions` +
`toolbarExtra` memanggil server action lalu mengunduh blob.

- Ekspor membawa **seluruh baris terfilter**, bukan potongan halaman yang
  sedang tampil.
- Kop ekspor memuat: judul, label periode, **Saldo Awal**, dan **catatan filter
  aktif** (bila ada).
- Footer memuat **Saldo Akhir**.
- Format mengikuti yang sudah ada: CSV (`buildCsv`, BOM + `;`) dan Excel HTML
  (`application/vnd.ms-excel`). **Tidak ada PDF** pada sub-proyek ini.

## 9. Model data & file

**Tanpa migrasi schema.** `Transaction`, `Period`, `Category` tidak berubah.

### File baru

| File | Peran |
|---|---|
| `src/lib/jurnal.ts` | `buildJurnal(periodId)`, `filterJournal(entries, filter)` **pure**, `journalTotals(entries)` **pure**, `journalToCsv`, `journalToExcelHtml` |
| `.../kas/laporan/LaporanTabs.tsx` | Tab nav client: Rekap Kategori ↔ Jurnal |
| `.../kas/laporan/JurnalTable.tsx` | Client wrapper `DataTable` + toolbar ekspor/cetak |
| `.../kas/laporan/jurnal/page.tsx` | Server page: filter, kartu invarian, hint, subtotal terfilter |
| `tests/jurnal.test.ts` | Unit test fungsi pure |

### Dimodifikasi

| File | Perubahan |
|---|---|
| `.../kas/laporan/page.tsx` | Tambah tab nav (satu import + satu komponen) |
| `.../kas/laporan/actions.ts` | Tambah `exportJurnal` |

### Tidak disentuh

`src/components/admin/DataTable.tsx`, `prisma/schema.prisma`, seluruh area
laporan publik.

## 10. API `src/lib/jurnal.ts`

```ts
export interface JournalEntry {
  id: string
  /** Nomor urut di buku besar penuh (1..N), invarian terhadap filter. */
  no: number
  tanggal: Date
  description: string
  kategori: string
  jenis: 'MASUK' | 'KELUAR'
  masuk: number   // 0 bila KELUAR
  keluar: number  // 0 bila MASUK
  /** Saldo kas SETELAH entri ini dibukukan — invarian terhadap filter/sort. */
  saldo: number
}

export interface JournalTotals {
  totalMasuk: number
  totalKeluar: number
  saldoAkhir: number
}

export interface JournalFilter {
  q?: string
  categoryId?: string
  jenis?: 'MASUK' | 'KELUAR'
  dari?: string   // YYYY-MM-DD
  sampai?: string // YYYY-MM-DD
}

/** DB: fetch periode + carry-forward + saldo berjalan atas SELURUH entri. */
export function buildJurnal(periodId: string): Promise<{
  saldoAwal: number
  entries: JournalEntry[]   // kronologis, saldo invarian
}>

/** Pure: subset tampilan. TIDAK mengubah `saldo`/`no` baris mana pun. */
export function filterJournal(entries: JournalEntry[], filter: JournalFilter): JournalEntry[]

/** Pure: total atas himpunan yang diberikan (panggil dengan entries penuh
 *  untuk kartu invarian; dengan subset untuk subtotal terfilter). */
export function journalTotals(entries: JournalEntry[]): JournalTotals
```

## 11. Akses & keamanan

- Halaman dan `exportJurnal` dijaga `requireRole('ADMIN', 'BENDAHARA')` — sama
  dengan halaman laporan yang ada.
- Jurnal **internal saja**, tidak diekspos ke publik.
- Nilai `dari` / `sampai` divalidasi format `YYYY-MM-DD` dan dicek validitas
  kalender (anti roll-over `2026-02-31`) sebelum dipakai `new Date()`.
- Id periode/kategori tak dikenal → `notFound()`, konsisten dengan halaman
  laporan yang ada.

## 12. Testing

`tests/jurnal.test.ts` — unit test fungsi **pure** (`filterJournal`,
`journalTotals`, penomoran) tanpa DB:

1. **Carry-forward** — periode berikutnya memakai saldo akhir sebelumnya;
   periode pertama → 0.
2. **Invarian saldo** — `filterJournal` tidak mengubah `saldo` baris mana pun.
3. **Invarian akhir** — `journalTotals(entries).saldoAkhir === entries.at(-1).saldo`.
4. **Filter** — kategori, jenis, rentang tanggal, search `q` (deskripsi +
   kategori, case-insensitive).
5. **Sort** — tanggal asc↔desc: nilai *Saldo* identik, hanya urutan berbalik.
6. **Subtotal terfilter ≠ kartu** — kartu tetap level periode.
7. **Penomoran** — `no` tetap 1..N buku besar penuh meski baris tersembunyi.

Verifikasi menyeluruh: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`,
dan e2e Playwright (tab nav, kartu invarian saat filter diaktifkan, ekspor).

## 13. Di luar lingkup

- Approval / maker–checker pada transaksi.
- Rekonsiliasi kas fisik vs buku.
- Kolom `saldoAwal` di `Period` (carry-forward dihitung, tidak disimpan).
- Laporan PDF bertanda tangan.
- Audit trail immutable / pembatalan entri.
- Jurnal publik.
