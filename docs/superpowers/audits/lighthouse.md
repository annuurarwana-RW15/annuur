# Audit Lighthouse

Ringkasan skor **di-commit** di file ini. JSON mentah `lighthouse-latest.json`
di-**gitignore** — jalankan ulang dengan `npm run audit:seo`.

## Cara menjalankan

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run build
NEXT_PUBLIC_SITE_URL=http://localhost:3001 npx next start -p 3001   # terminal terpisah
npm run audit:seo
```

`NEXT_PUBLIC_SITE_URL` harus menunjuk ke port yang diaudit supaya canonical dan
OG image konsisten dengan URL yang diuji. Setelah selesai, hentikan server.

Target **build produksi** (`next start`), bukan `next dev` — dev tidak
mewakili HTML maupun performa yang sebenarnya. (Keputusan 18 Okt 2026.)

## Hasil

### 2026-10-18 — Lighthouse 13.5.0, `http://localhost:3001/`

| Kategori | Skor | Ambang plan | Status |
| --- | ---: | ---: | --- |
| SEO | **100** | ≥ 90 | ✅ lolos |
| Best Practices | **100** | — | ✅ |
| Performance | **69** | — | ⚠️ |

Detail Performance: FCP 1,1 s · LCP 4,3 s (subskor 0,42) · TBT 670 ms (subskor 0,44).

- **SEO 100** → sesuai Task 22 Step 3 ("perbaiki metadata bila < 90"), **tidak
  ada perbaikan metadata** yang diperlukan. Semua audit SEO lolos, nol yang gagal.
- Best Practices 100 — naik dari 96 pada audit `70b9c58`.
- Performance 69: LCP & TBT di bawah 90. Diukur dengan throttle *simulated 4G*
  bawaan Lighthouse di localhost, jadi angka mutlak akan berbeda di perangkat
  nyata. Tidak termasuk ambang plan, dicatat sebagai pengamatan.

### Riwayat

| Tanggal | Lighthouse | SEO | Best Practices | Catatan |
| --- | --- | ---: | ---: | --- |
| 2026-10-11 (`70b9c58`) | — | 100 | 96 | hanya tercatat di pesan commit, tanpa artefak |
| 2026-10-18 | 13.5.0 | 100 | 100 | audit pertama yang tersimpan sebagai artefak |
