# Modul Inventaris & Tata Kelola Aset Masjid — Desain Teknis

Tanggal: 2026-11-04  
Status: Draf Usulan untuk Review  
Lingkup: Sistem Inventaris, Tata Kelola Peralatan, Sirkulasi Peminjaman & Pengembalian Warga, Pengadaan/Wakaf, dan PIC Petugas DKM.

---

## 1. Latar Belakang & Lingkup

Masjid An-Nuur Arwana memiliki berbagai aset dan peralatan penting yang digunakan baik untuk operasional ibadah harian maupun pelayanan masyarakat/jamaah sekitar (seperti tenda, kursi, terpal, sound portable, genset, proyektor, hingga perlengkapan fardhu kifayah jenazah).

Sebelumnya, pencatatan aset masjid dan peminjaman oleh warga (untuk hajatan, pengajian RT, maupun musibah takziah) masih manual atau belum terpusat di dashboard DKM, yang menimbulkan risiko:
1. Barang tertinggal di warga dan lupa dikembalikan.
2. Kerusakan/kehilangan barang tidak terdeteksi saat serah-terima.
3. Sulit membedakan barang wakaf umat (amanah syar'i) dengan barang yang dibeli dari anggaran kas masjid.
4. Bentrok peminjaman karena tidak adanya visibilitas stok yang sedang dipinjam vs yang tersedia di gudang.

### Lingkup Fitur (In-Scope)
* **Katalog Aset & Tata Kelola:** Pencatatan kode inventaris, nama barang, kategori, lokasi penyimpanan fisik, label wakaf vs kas, dan proteksi status *Boleh Dipinjam* vs *Khusus Operasional Masjid*.
* **Manajemen Stok Real-Time:** Menegakkan invarian stok: `totalQty = availableQty + borrowedQty + brokenQty`.
* **Sirkulasi Peminjaman (Internal Admin):** Pencatatan peminjaman oleh petugas DKM (Nama warga, kontak WA, alamat RT/RW, tujuan acara, daftar multi-barang, tanggal pinjam, estimasi kembali, dan nama Petugas PIC penyerah).
* **Sirkulasi Pengembalian & Penanganan Kerusakan:** Pencatatan pengembalian parsial maupun penuh, verifikasi kondisi fisik saat kembali (baik vs rusak/hilang), nama Petugas PIC penerima, dan mutasi otomatis ke stok rusak/tersedia.
* **Cetak Lembar Tanda Terima Pinjam (Printable Slip):** Tata letak ramah cetak (print CSS) berisi bukti serah terima resmi dengan kolom tanda tangan Peminjam & Petugas DKM.
* **Pengadaan Baru (Penambahan Aset):** Pencatatan barang baru dari Pembelian Kas Masjid (opsional terhubung otomatis ke pencatatan Transaksi Kas Keluar) atau Hibah/Wakaf Jamaah (mencatat nama wakif tanpa memotong kas).

### Di Luar Lingkup (Out-of-Scope)
* Barcode scanning kamera / RFID scanner fisik (cukup kode teks inventaris yang rapi).
* Formulir peminjaman publik terbuka di portal warga (sesuai keputusan brainstorming: peminjaman dicatat internal oleh admin/marbot untuk menghindari spam/kerumitan verifikasi KTP online).
* Perhitungan depresiasi akuntansi komersial tahunan (tidak relevan untuk masjid nirlaba).

---

## 2. Keputusan yang Telah Disepakati

| Topik | Keputusan | Rasional |
|---|---|---|
| **Akses Sirkulasi** | **Internal Admin Dashboard** | Menjaga akurasi fisik gudang dan mencegah pemesanan fiktif oleh pihak luar. |
| **Model Hak Akses** | **ADMIN & BENDAHARA** | Modul dikelola oleh admin/bendahara, sedangkan petugas serah-terima lapangan (marbot/seksi sarpras) dicatat sebagai teks nama PIC di formulir tanpa mewajibkan akun login terpisah. |
| **Model Kuantitas Barang** | **Model Hybrid** | Kode inventaris unik per jenis barang (misal: `INV-TND-01`), dengan pelacakan jumlah stok agregat (*Total, Tersedia, Dipinjam, Rusak*). |
| **Integrasi Kas** | **Opsional Terhubung** | Pengadaan baru bisa memilih: dibeli kas masjid (otomatis membuat baris `Transaction` jenis KELUAR) atau wakaf/hibah jamaah (Rp 0 kas keluar). |
| **Pengembalian Parsial** | **Didukung Penuh** | Warga yang baru mengembalikan sebagian barang tetap tercatat riil stoknya tanpa menggantung status pinjaman. |

---

## 3. Invarian Sistem & Integritas Data

1. **Invarian Kuantitas Stok:**
   $$\text{totalQty} = \text{availableQty} + \text{borrowedQty} + \text{brokenQty}$$
   * Setiap peminjaman barang sebesar $N$ akan memindahkan:
     $$\text{availableQty} \gets \text{availableQty} - N$$
     $$\text{borrowedQty} \gets \text{borrowedQty} + N$$
   * Setiap pengembalian barang sebesar $R_{\text{baik}} + R_{\text{rusak}}$ akan memindahkan:
     $$\text{borrowedQty} \gets \text{borrowedQty} - (R_{\text{baik}} + R_{\text{rusak}})$$
     $$\text{availableQty} \gets \text{availableQty} + R_{\text{baik}}$$
     $$\text{brokenQty} \gets \text{brokenQty} + R_{\text{rusak}}$$
   * Mutasi stok dieksekusi secara atomik dalam satu Prisma `$transaction`.

2. **Invarian Ketersediaan Peminjaman:**
   Peminjaman baru **hanya diizinkan** jika:
   * Barang memiliki `isBorrowable == true`.
   * Kuantitas yang diminta $\le \text{availableQty}$.

3. **Invarian Status Pinjaman:**
   * Jika seluruh barang telah dikembalikan $\rightarrow$ Status: `SELESAI`.
   * Jika sebagian barang telah dikembalikan $\rightarrow$ Status: `KEMBALI_SEBAGIAN`.
   * Jika belum kembali dan tanggal saat ini $>$ `expectedReturn` $\rightarrow$ Status: `TERLAMBAT`.

---

## 4. Skema Database (Prisma Models)

Penambahan ke [`prisma/schema.prisma`](file:///Users/a/Documents/DKM/prisma/schema.prisma):

```prisma
enum InventoryCategoryType {
  SARPRAS_UMUM      // Tenda, kursi plastik, terpal, meja lipat
  ELEKTRONIK_AUDIO  // Sound portable, mic wireless, genset, kabel rol
  IBADAH_PENGAJIAN  // Al-Qur'an, rehal, proyektor, layar proyektor
  RUKUN_KEMATIAN    // Tenda pemandian jenazah, keranda, kain penutup
  KEBERSIHAN_DAPUR  // Vacuum cleaner, mesin cuci karpet, kompor, dandang
}

enum LoanStatus {
  DIPINJAM
  KEMBALI_SEBAGIAN
  SELESAI
  TERLAMBAT
}

model InventoryItem {
  id            String                @id @default(cuid())
  code          String                @unique // Kode unik: misal "INV-TND-01"
  name          String                // Nama barang: misal "Kursi Lipat Hijau Napolly"
  category      InventoryCategoryType @default(SARPRAS_UMUM)
  location      String                // Lokasi gudang: misal "Gudang Belakang Lt. 1"
  isBorrowable  Boolean               @default(true) // Boleh dipinjam warga atau tidak
  
  // Stok agregat
  totalQty      Int                   @default(1)
  availableQty  Int                   @default(1)
  borrowedQty   Int                   @default(0)
  brokenQty     Int                   @default(0)
  
  // Asal-usul & Nilai Aset
  isWaqf        Boolean               @default(false)
  waqfDonor     String?               // Nama pewakaf (wakif) jika wakaf
  priceEstimate Decimal?              @db.Decimal(18, 2)
  notes         String?
  image         String?               // URL foto barang
  
  loanItems     InventoryLoanItem[]
  acquisitions  InventoryAcquisition[]
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  @@index([category, isBorrowable])
}

model InventoryLoan {
  id              String              @id @default(cuid())
  code            String              @unique // Nomor peminjaman: PINJAM-YYYYMM-XXXX
  borrowerName    String              // Nama warga / penanggung jawab
  borrowerPhone   String              // Nomor telepon / WA
  borrowerAddress String?             // Alamat / RT / RW
  purpose         String              // Acara: misal "Tasyakuran & Maulid RT 03"
  loanDate        DateTime            @default(now())
  expectedReturn  DateTime            // Rencana waktu kembali
  actualReturn    DateTime?           // Realisasi waktu kembali penuh
  status          LoanStatus          @default(DIPINJAM)
  
  officerOut      String              // Nama Petugas PIC yang menyerahkan barang
  officerIn       String?             // Nama Petugas PIC yang menerima barang kembali
  notes           String?
  
  items           InventoryLoanItem[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([status, expectedReturn])
  @@index([loanDate])
}

model InventoryLoanItem {
  id           String        @id @default(cuid())
  loanId       String
  loan         InventoryLoan @relation(fields: [loanId], references: [id], onDelete: Cascade)
  itemId       String
  item         InventoryItem @relation(fields: [itemId], references: [id])
  
  borrowedQty  Int           // Jumlah barang yang dipinjam
  returnedQty  Int           @default(0) // Jumlah yang kembali dalam kondisi baik
  brokenQty    Int           @default(0) // Jumlah yang kembali dalam kondisi rusak
  missingQty   Int           @default(0) // Jumlah yang hilang / belum kembali
}

model InventoryAcquisition {
  id            String        @id @default(cuid())
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  quantity      Int           // Jumlah penambahan
  source        String        // "PEMBELIAN_KAS" atau "WAKAF_HIBAH"
  unitPrice     Decimal?      @db.Decimal(18, 2)
  donorName     String?       // Nama donatur / wakif
  officer       String        // Nama petugas penerima barang
  date          DateTime      @default(now())
  notes         String?
  
  transactionId String?       @unique // Hubungan ke buku kas jika dibeli dengan kas masjid
  transaction   Transaction?  @relation(fields: [transactionId], references: [id])
}
```

---

## 5. Struktur Antarmuka & Halaman Admin

Menu baru pada Navigasi Sidebar Admin: **"Inventaris"** (`/admin/inventaris`).

### 5.1 Halaman Katalog Barang (`/admin/inventaris`)
* **Ringkasan Metrik (Header Cards):**
  * Total Jenis Barang
  * Total Unit Tersedia
  * Unit Sedang Dipinjam
  * Unit Butuh Perbaikan (Rusak)
* **Tabel Master Barang:**
  * Kolom: Kode, Nama Barang, Kategori, Lokasi, Status Pinjam (Boleh/Tidak), Stok (Tersedia/Total), Status Wakaf.
  * Filter: Berdasarkan Kategori, Status Pinjam, dan Status Ketersediaan Stok.
  * Aksi: *+ Tambah Barang Baru*, *Edit Barang*, *Hapus Barang* (hanya jika belum ada relasi pinjaman aktif).

### 5.2 Halaman Sirkulasi Peminjaman (`/admin/inventaris/peminjaman`)
* **Tab Navigasi:**
  * **Sedang Berjalan:** Menampilkan pinjaman berstatus `DIPINJAM` atau `KEMBALI_SEBAGIAN`. Menampilkan indikator visual (badge merah) jika melewati tanggal rencana pengembalian (`TERLAMBAT`).
  * **Riwayat Selesai:** Log seluruh peminjaman yang telah berstatus `SELESAI`.
* **Formulir Pinjam Baru (`/admin/inventaris/peminjaman/baru`):**
  * Data Peminjam: Nama, Nomor WA, Alamat RT/RW, Keperluan Acara, Tanggal Pinjam, Estimasi Tanggal Kembali, Nama Petugas PIC Serah Terima.
  * Pemilih Barang Dinamis: Multi-row selector untuk memilih barang dan memasukkan kuantitas (dengan validasi real-time agar tidak melebihi `availableQty`).
* **Fitur Cetak Tanda Terima (`/admin/inventaris/peminjaman/[id]/cetak`):**
  * Halaman minimalis khusus cetak A4/struk dengan header resmi DKM Masjid An-Nuur Arwana, tabel rincian barang, tanggal batas waktu kembali, catatan syarat & ketentuan, serta kolom tanda tangan basah untuk Peminjam & Petugas DKM.
* **Modal Catat Pengembalian:**
  * Menampilkan daftar barang yang belum kembali.
  * Input kuantitas: Jumlah Kembali Baik vs Jumlah Rusak/Hilang.
  * Input nama Petugas PIC yang menerima dan catatan kondisi fisik.

### 5.3 Halaman Riwayat Pengadaan (`/admin/inventaris/pengadaan`)
* Tabel riwayat penambahan stok: Tanggal, Nama Barang, Jumlah, Sumber (Beli Kas / Wakaf), Nilai/Harga, Nama Donatur/Wakif, Petugas Penerima.
* Modal *Catat Pengadaan Baru*: Menambah stok barang yang ada atau mencatat aset baru, dengan sakelar opsi: *"Catat otomatis ke Buku Kas Keluar"*.

---

## 6. Keamanan & Hak Akses (RBAC)

* **Hak Akses Baru:** `'manage_inventory'` ditambahkan ke `src/lib/rbac.ts`.
* Role yang diizinkan: `ADMIN` dan `BENDAHARA`.
* Role `KONTEN` dan `VIEWER` tidak dapat melihat menu mutasi maupun memodifikasi inventaris.
* Server Actions memvalidasi input menggunakan Zod schema sebelum mengeksekusi operasi database.

---

## 7. Rencana Pengujian (Testing Strategy)

1. **Unit & Invariant Tests (`tests/inventaris-invariants.test.ts`):**
   * Verifikasi rumus invarian stok saat peminjaman sukses.
   * Verifikasi pengembalian sebagian (partial return) dan pengembalian barang rusak.
   * Verifikasi penolakan peminjaman jika stok tidak mencukupi atau jika `isBorrowable == false`.
2. **Server Action Tests (`tests/inventaris-actions.test.ts`):**
   * Pengujian validasi Zod schema (nama kosong, tanggal kembali lebih lampau dari tanggal pinjam, kuantitas $\le 0$).
   * Pengujian RBAC (role unauthorized ditolak).
   * Pengujian relasi otomatis ke kas masjid saat pengadaan pembelian kas dipilih.
3. **Komponen & UI Tests (`tests/inventaris-ui.test.tsx`):**
   * Render kartu metrik inventaris.
   * Render tabel sirkulasi dan badge status pinjaman.
   * Render halaman cetak bukti pinjam.
