# Jurnal Kas dengan Saldo Berjalan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah tab **Jurnal** di `/admin/kas/laporan` yang menampilkan buku besar kronologis dengan saldo berjalan, di mana search & filter menyembunyikan baris **tanpa pernah** mengubah angka saldo.

**Architecture:** Sub-route `/admin/kas/laporan/jurnal` + tab nav (dua `DataTable` tidak boleh berbagi URL karena memakai nama param global `q/page/size/sort/dir`). Logika murni (filter, sort, total, ekspor) dipisah di `src/lib/jurnal.ts` agar bisa diuji tanpa DB; `buildJurnal` menangani fetch + carry-forward. Tanpa migrasi schema.

**Tech Stack:** Next.js App Router (server components + server actions), Prisma/PostgreSQL, `recharts` tidak dipakai di sini, `DataTable` admin yang sudah ada, Vitest, Playwright (channel `chrome`).

**Spec:** `docs/superpowers/specs/2026-10-17-jurnal-kas-saldo-berjalan-design.md`

## Global Constraints

- **Invarian saldo:** kolom `Saldo`, kolom `No`, kartu Saldo Awal / Total Masuk / Total Keluar / Saldo Akhir **tidak boleh berubah** saat search/filter diaktifkan. Hanya baris tampilan, hint, dan subtotal terfilter yang berubah.
- **`Saldo` = saldo SETELAH entri** dibukukan.
- **Carry-forward:** `saldoAwal(P) = Σ masuk − Σ keluar` semua transaksi di periode dengan `startDate < P.startDate`. Periode pertama → `0`.
- **Urutan baku:** `[date asc, createdAt asc, id asc]`. Hanya kolom **Tanggal** yang sortable; tie-break ikut arah sort. Kolom `no` selalu posisi kronologis 1..N.
- **Tanpa migrasi schema.** `src/components/admin/DataTable.tsx` **tidak dimodifikasi**.
- Akses: `requireRole('ADMIN', 'BENDAHARA')` untuk halaman dan `exportJurnal`.
- Bahasa UI Indonesia; format rupiah `formatRupiah` (`Rp 1.234.567`); tanggal `formatDateID`.
- Verifikasi wajib tiap task akhir: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`.
- Catatan lingkungan: path ber-`()` harus dikutip di zsh. Dev server `npm run dev` → localhost:3000 (log `/tmp/dkm-dev.log`); e2e lokal pakai `E2E_BASE_URL=http://localhost:3000`.

---

### Task 1: Logika murni `src/lib/jurnal.ts`

**Files:**
- Create: `src/lib/jurnal.ts`
- Test: `tests/jurnal.test.ts`

**Interfaces:**
- Produces (dipakai Task 2–4):
  - `interface JournalEntry { id, no, tanggal: Date, description, kategoriId, kategori, jenis: 'MASUK'|'KELUAR', masuk, keluar, saldo }`
  - `interface JournalTotals { totalMasuk, totalKeluar, net }`
  - `interface JournalFilter { q?, categoryId?, jenis?, dari?, sampai? }`
  - `function parseISODate(value?: string): Date | undefined`
  - `function filterJournal(entries: JournalEntry[], filter: JournalFilter): JournalEntry[]`
  - `function sortJournal(entries: JournalEntry[], dir: 'asc'|'desc'): JournalEntry[]`
  - `function journalTotals(entries: JournalEntry[]): JournalTotals`
  - `function journalToCsv(ctx: { saldoAwal, entries, periodLabel, filterNote? }): string`
  - `function journalToExcelHtml(ctx: { saldoAwal, entries, periodLabel, filterNote? }): string`

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/jurnal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  filterJournal,
  journalTotals,
  journalToCsv,
  journalToExcelHtml,
  parseISODate,
  sortJournal,
  type JournalEntry,
} from '@/lib/jurnal'

function entry(overrides: Partial<JournalEntry> & { no: number }): JournalEntry {
  return {
    id: `e${overrides.no}`,
    tanggal: new Date(2026, 9, overrides.no),
    description: `Entri ${overrides.no}`,
    kategoriId: 'cat-infak',
    kategori: 'Infak',
    jenis: 'MASUK',
    masuk: 0,
    keluar: 0,
    saldo: 0,
    ...overrides,
  }
}

/** Buku besar penuh 5 entri, saldo berjalan sudah dihitung (invarian). */
const FULL: JournalEntry[] = [
  entry({ no: 1, jenis: 'MASUK', masuk: 100_000, saldo: 100_000 }),
  entry({
    no: 2,
    jenis: 'KELUAR',
    kategoriId: 'cat-sosial',
    kategori: 'Sosial',
    keluar: 30_000,
    saldo: 70_000,
    description: 'Santunan anak yatim',
  }),
  entry({ no: 3, jenis: 'MASUK', masuk: 50_000, saldo: 120_000 }),
  entry({
    no: 4,
    jenis: 'KELUAR',
    kategoriId: 'cat-sosial',
    kategori: 'Sosial',
    keluar: 20_000,
    saldo: 100_000,
    description: 'Operasional',
  }),
  entry({ no: 5, jenis: 'MASUK', masuk: 40_000, saldo: 140_000 }),
]

const saldoMap = (rows: JournalEntry[]) => rows.map((r) => [r.no, r.saldo] as const)

describe('parseISODate', () => {
  it('menerima YYYY-MM-DD valid', () => {
    expect(parseISODate('2026-10-15')?.getFullYear()).toBe(2026)
    expect(parseISODate('2026-10-15')?.getMonth()).toBe(9)
  })
  it('menolak format salah', () => {
    expect(parseISODate('15-10-2026')).toBeUndefined()
    expect(parseISODate('2026-10')).toBeUndefined()
    expect(parseISODate('')).toBeUndefined()
    expect(parseISODate(undefined)).toBeUndefined()
  })
  it('menolak roll-over kalender', () => {
    expect(parseISODate('2026-02-31')).toBeUndefined()
    expect(parseISODate('2026-13-01')).toBeUndefined()
    expect(parseISODate('2026-00-10')).toBeUndefined()
  })
})

describe('filterJournal — invarian saldo', () => {
  it('filter tidak mengubah saldo baris mana pun', () => {
    const before = saldoMap(FULL)
    const filtered = filterJournal(FULL, { q: 'santunan' })
    for (const row of filtered) {
      expect(row.saldo).toBe(FULL.find((r) => r.no === row.no)!.saldo)
      expect(row.no).toBe(FULL.find((r) => r.no === row.no)!.no)
    }
    expect(saldoMap(FULL)).toEqual(before)
  })

  it('filter kategori menyisakan hanya kategori itu', () => {
    expect(filterJournal(FULL, { categoryId: 'cat-sosial' }).map((r) => r.no)).toEqual([
      2, 4,
    ])
  })

  it('filter jenis', () => {
    expect(filterJournal(FULL, { jenis: 'KELUAR' }).map((r) => r.no)).toEqual([2, 4])
    expect(filterJournal(FULL, { jenis: 'MASUK' }).map((r) => r.no)).toEqual([1, 3, 5])
  })

  it('filter rentang tanggal inklusif', () => {
    // entri memakai tanggal 3..7 Okt 2026 (new Date(2026,9,no))
    expect(filterJournal(FULL, { dari: '2026-10-04', sampai: '2026-10-06' }).map((r) => r.no)).toEqual([
      4, 5, 6,
    ].filter((n) => n <= 5 && FULL.some((r) => r.no === n)))
  })

  it('search q mencocokkan deskripsi & kategori, case-insensitive', () => {
    expect(filterJournal(FULL, { q: 'SANTUNAN' }).map((r) => r.no)).toEqual([2])
    expect(filterJournal(FULL, { q: 'infak' }).map((r) => r.no)).toEqual([1, 3, 5])
  })

  it('tanpa filter → semua baris, urutan asli', () => {
    expect(filterJournal(FULL, {}).map((r) => r.no)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('sortJournal', () => {
  it('asc mengembalikan urutan asli tanpa menyentuh saldo', () => {
    const sorted = sortJournal(FULL, 'asc')
    expect(sorted.map((r) => r.no)).toEqual([1, 2, 3, 4, 5])
    expect(saldoMap(sorted)).toEqual(saldoMap(FULL))
  })
  it('desc membalik urutan, nilai saldo identik', () => {
    const sorted = sortJournal(FULL, 'desc')
    expect(sorted.map((r) => r.no)).toEqual([5, 4, 3, 2, 1])
    expect(sorted.map((r) => r.saldo)).toEqual([140_000, 100_000, 120_000, 70_000, 100_000])
  })
})

describe('journalTotals', () => {
  it('menjumlah masuk/keluar & net TANPA saldoAwal', () => {
    expect(journalTotals(FULL)).toEqual({
      totalMasuk: 190_000,
      totalKeluar: 50_000,
      net: 140_000,
    })
  })
  it('subtotal terfilter ≠ total penuh (kartu tetap level periode)', () => {
    const sub = journalTotals(filterJournal(FULL, { categoryId: 'cat-sosial' }))
    expect(sub.totalMasuk).toBe(0)
    expect(sub.totalKeluar).toBe(50_000)
    expect(sub.net).toBe(-50_000)
  })
  it('himpunan kosong → semua nol', () => {
    expect(journalTotals([])).toEqual({ totalMasuk: 0, totalKeluar: 0, net: 0 })
  })
})

describe('ekspor', () => {
  const ctx = {
    saldoAwal: 500_000,
    entries: FULL,
    periodLabel: 'Periode 2026 (1 Jan – 31 Des 2026)',
  }

  it('CSV memuat kop, saldo awal, header kolom, dan baris SALDO AKHIR', () => {
    const csv = journalToCsv(ctx)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('LAPORAN JURNAL KAS')
    expect(csv).toContain('Saldo Awal (periode sebelumnya);500000')
    expect(csv).toContain('No;Tanggal;Keterangan;Kategori;Jenis;Masuk;Keluar;Saldo')
    expect(csv).toContain('SALDO AKHIR')
    // saldoAkhir = saldoAwal(500000) + net(140000) = 640000
    expect(csv).toContain('640000')
  })

  it('CSV memuat catatan filter bila ada', () => {
    const csv = journalToCsv({ ...ctx, filterNote: 'kategori Sosial' })
    expect(csv).toContain('Filter;kategori Sosial')
  })

  it('Excel HTML memuat kop & kolom', () => {
    const html = journalToExcelHtml(ctx)
    expect(html).toContain('LAPORAN JURNAL KAS')
    expect(html).toContain('<th>Saldo</th>')
    expect(html).toContain('640000')
  })

  it('Excel HTML meng-escape teks berbahaya', () => {
    const html = journalToExcelHtml({
      ...ctx,
      entries: [entry({ no: 1, description: '<script>x</script>', saldo: 1 })],
    })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npx vitest run tests/jurnal.test.ts`
Expected: FAIL — modul `@/lib/jurnal` tidak ditemukan.

- [ ] **Step 3: Tulis implementasi minimal**

Buat `src/lib/jurnal.ts`:

```ts
import { buildCsv } from '@/lib/table-query'

export interface JournalEntry {
  id: string
  /** Nomor urut di buku besar penuh (1..N), invarian terhadap filter. */
  no: number
  tanggal: Date
  description: string
  kategoriId: string
  kategori: string
  jenis: 'MASUK' | 'KELUAR'
  masuk: number
  keluar: number
  /** Saldo kas SETELAH entri ini dibukukan — invarian terhadap filter/sort. */
  saldo: number
}

export interface JournalTotals {
  totalMasuk: number
  totalKeluar: number
  /** totalMasuk − totalKeluar. TIDAK termasuk saldoAwal. */
  net: number
}

export interface JournalFilter {
  q?: string
  categoryId?: string
  jenis?: 'MASUK' | 'KELUAR'
  /** YYYY-MM-DD */
  dari?: string
  /** YYYY-MM-DD */
  sampai?: string
}

export interface JournalExportContext {
  saldoAwal: number
  entries: JournalEntry[]
  periodLabel: string
  filterNote?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Validasi YYYY-MM-DD + cek kalender (tolak 2026-02-31 / 2026-13-01). */
export function parseISODate(value: string | undefined): Date | undefined {
  if (!value || !DATE_RE.test(value)) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const ok =
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  return ok ? date : undefined
}

/**
 * Subset tampilan. TIDAK mengubah `saldo`/`no` baris mana pun — saldo adalah
 * properti transaksi, bukan properti tampilan.
 */
export function filterJournal(
  entries: JournalEntry[],
  filter: JournalFilter,
): JournalEntry[] {
  const query = filter.q?.trim().toLowerCase() ?? ''
  const dari = parseISODate(filter.dari)
  const sampai = parseISODate(filter.sampai)

  return entries.filter((entry) => {
    if (filter.categoryId && entry.kategoriId !== filter.categoryId) return false
    if (filter.jenis && entry.jenis !== filter.jenis) return false
    if (dari && entry.tanggal < dari) return false
    if (sampai) {
      // inklusif: bandingkan tanggal (abaikan waktu)
      const end = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate() + 1)
      if (entry.tanggal >= end) return false
    }
    if (query) {
      const hay = `${entry.description} ${entry.kategori}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

/**
 * `entries` dari `buildJurnal` selalu kronologis asc → desc cukup dibalik.
 * Nilai `saldo` tidak dihitung ulang.
 */
export function sortJournal(
  entries: JournalEntry[],
  dir: 'asc' | 'desc',
): JournalEntry[] {
  return dir === 'desc' ? [...entries].reverse() : entries
}

/** Total atas himpunan yang diberikan. Untuk kartu invarian → panggil dengan entries penuh. */
export function journalTotals(entries: JournalEntry[]): JournalTotals {
  let totalMasuk = 0
  let totalKeluar = 0
  for (const entry of entries) {
    totalMasuk += entry.masuk
    totalKeluar += entry.keluar
  }
  return { totalMasuk, totalKeluar, net: totalMasuk - totalKeluar }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function excelText(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return escapeHtml(safe)
}

function saldoAkhirOf(ctx: JournalExportContext): number {
  return ctx.saldoAwal + journalTotals(ctx.entries).net
}

const CSV_HEADERS = [
  'No',
  'Tanggal',
  'Keterangan',
  'Kategori',
  'Jenis',
  'Masuk',
  'Keluar',
  'Saldo',
] as const

/** CSV id-ID: BOM + kop + tabel + baris SALDO AKHIR. */
export function journalToCsv(ctx: JournalExportContext): string {
  const metaLines = [
    'LAPORAN JURNAL KAS',
    ctx.periodLabel,
    `Saldo Awal (periode sebelumnya);${ctx.saldoAwal}`,
    ...(ctx.filterNote ? [`Filter;${ctx.filterNote}`] : []),
    '',
  ]
  const table = buildCsv(CSV_HEADERS as unknown as string[], [
    ...ctx.entries.map(
      (e) =>
        [e.no, isoDate(e.tanggal), e.description, e.kategori, e.jenis, e.masuk, e.keluar, e.saldo] as (
          | string
          | number
        )[],
    ),
    ['SALDO AKHIR', '', '', '', '', '', '', saldoAkhirOf(ctx)] as (string | number)[],
  ])
  // buildCsv menempelkan BOM di depan; pindahkan ke depan kop.
  return `﻿${metaLines.join('\n')}\n${table.replace(/^﻿/, '')}`
}

/** HTML table untuk Blob `application/vnd.ms-excel`. */
export function journalToExcelHtml(ctx: JournalExportContext): string {
  const head =
    `<tr><th colspan="8" style="text-align:left">${excelText('LAPORAN JURNAL KAS')}</th></tr>` +
    `<tr><td colspan="8">${excelText(ctx.periodLabel)}</td></tr>` +
    `<tr><td colspan="8">Saldo Awal (periode sebelumnya): ${ctx.saldoAwal}</td></tr>` +
    (ctx.filterNote
      ? `<tr><td colspan="8">Filter: ${excelText(ctx.filterNote)}</td></tr>`
      : '') +
    `<tr>${CSV_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr>`
  const body = ctx.entries
    .map(
      (e) =>
        `<tr><td>${e.no}</td><td>${isoDate(e.tanggal)}</td>` +
        `<td>${excelText(e.description)}</td><td>${excelText(e.kategori)}</td>` +
        `<td>${e.jenis}</td><td>${e.masuk}</td><td>${e.keluar}</td><td>${e.saldo}</td></tr>`,
    )
    .join('')
  const foot = `<tr><td colspan="7">SALDO AKHIR</td><td>${saldoAkhirOf(ctx)}</td></tr>`
  return (
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    '<head><meta charset="UTF-8" /></head><body><table>' +
    `<thead>${head}</thead><tbody>${body}${foot}</tbody>` +
    '</table></body></html>'
  )
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npx vitest run tests/jurnal.test.ts`
Expected: PASS semua.

Bila test rentang tanggal gagal, periksa `filterJournal`: `dari` inklusif (`tanggal >= dari`) dan `sampai` inklusif hari penuh (`tanggal < sampai+1hari`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jurnal.ts tests/jurnal.test.ts
git commit -m "feat: logika murni jurnal kas — filter & sort aman-saldo, ekspor CSV/Excel"
```

---

### Task 2: `buildJurnal` — fetch DB + carry-forward

**Files:**
- Modify: `src/lib/jurnal.ts` (tambah `buildJurnal`)
- Test: `tests/jurnal.test.ts` (tambah describe)

**Interfaces:**
- Consumes: `JournalEntry` dari Task 1, `db` dari `@/lib/db`
- Produces: `function buildJurnal(periodId: string): Promise<{ saldoAwal: number; entries: JournalEntry[] }>`

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan ke `tests/jurnal.test.ts` — impor `vi` dan `beforeEach`, lalu:

```ts
const h = vi.hoisted(() => ({
  db: {
    period: { findUnique: vi.fn(), findMany: vi.fn() },
    transaction: { groupBy: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: h.db }))
```

Ubah baris impor atas menjadi:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildJurnal,
  filterJournal,
  journalTotals,
  journalToCsv,
  journalToExcelHtml,
  parseISODate,
  sortJournal,
  type JournalEntry,
} from '@/lib/jurnal'
```

Tambah describe baru di akhir file:

```ts
describe('buildJurnal', () => {
  const PERIOD = {
    id: 'p-2026',
    name: '2026',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 11, 31),
  }

  beforeEach(() => {
    h.db.period.findUnique.mockReset()
    h.db.period.findMany.mockReset()
    h.db.transaction.groupBy.mockReset()
    h.db.transaction.findMany.mockReset()
    h.db.period.findUnique.mockResolvedValue(PERIOD)
    h.db.period.findMany.mockResolvedValue([])
    h.db.transaction.groupBy.mockResolvedValue([])
    h.db.transaction.findMany.mockResolvedValue([])
  })

  it('periode tidak ditemukan → throw', async () => {
    h.db.period.findUnique.mockResolvedValue(null)
    await expect(buildJurnal('missing')).rejects.toThrow('Periode tidak ditemukan')
  })

  it('periode pertama (tanpa periode sebelumnya) → saldoAwal 0', async () => {
    const result = await buildJurnal('p-2026')
    expect(result.saldoAwal).toBe(0)
    expect(h.db.period.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { startDate: { lt: PERIOD.startDate } } }),
    )
    expect(h.db.transaction.groupBy).not.toHaveBeenCalled()
  })

  it('carry-forward: saldoAwal = masuk − keluar periode sebelumnya', async () => {
    h.db.period.findMany.mockResolvedValue([{ id: 'p-2024' }, { id: 'p-2025' }])
    h.db.transaction.groupBy.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: 800_000 } },
      { type: 'KELUAR', _sum: { amount: 300_000 } },
    ])
    const result = await buildJurnal('p-2026')
    expect(result.saldoAwal).toBe(500_000)
    expect(h.db.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['type'],
        where: { periodId: { in: ['p-2024', 'p-2025'] } },
      }),
    )
  })

  it('menghitung saldo berjalan & nomor urut 1..N atas urutan kronologis', async () => {
    h.db.transaction.findMany.mockResolvedValue([
      {
        id: 't1',
        date: new Date(2026, 0, 5),
        description: 'Infak awal',
        type: 'MASUK',
        amount: 100_000,
        category: { id: 'c1', name: 'Infak' },
      },
      {
        id: 't2',
        date: new Date(2026, 1, 1),
        description: 'Beli karpet',
        type: 'KELUAR',
        amount: 40_000,
        category: { id: 'c2', name: 'Sosial' },
      },
    ])
    h.db.transaction.groupBy.mockResolvedValue([
      { type: 'MASUK', _sum: { amount: 500_000 } },
      { type: 'KELUAR', _sum: { amount: 0 } },
    ])
    h.db.period.findMany.mockResolvedValue([{ id: 'p-2025' }])

    const { saldoAwal, entries } = await buildJurnal('p-2026')
    expect(saldoAwal).toBe(500_000)
    expect(entries.map((e) => e.no)).toEqual([1, 2])
    expect(entries.map((e) => e.saldo)).toEqual([600_000, 560_000])
    expect(entries[0]).toMatchObject({
      id: 't1',
      kategoriId: 'c1',
      kategori: 'Infak',
      jenis: 'MASUK',
      masuk: 100_000,
      keluar: 0,
    })
    expect(entries[1]).toMatchObject({ jenis: 'KELUAR', masuk: 0, keluar: 40_000 })
  })

  it('query findMany memakai urutan kronologis [date, createdAt, id]', async () => {
    await buildJurnal('p-2026')
    expect(h.db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { periodId: 'p-2026' },
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    )
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npx vitest run tests/jurnal.test.ts`
Expected: FAIL — `buildJurnal` tidak diekspor.

- [ ] **Step 3: Implementasi**

Tambahkan ke `src/lib/jurnal.ts` (di bawah impor, di atas interface — atau di akhir file, konsisten):

```ts
import { db } from '@/lib/db'
```

dan fungsi:

```ts
/**
 * Fetch SELURUH transaksi periode, urut kronologis, plus saldoAwal carry-forward.
 * `entries[i].saldo` = saldo kas SETELAH entri i — invarian terhadap filter.
 */
export async function buildJurnal(periodId: string): Promise<{
  saldoAwal: number
  entries: JournalEntry[]
}> {
  const period = await db.period.findUnique({ where: { id: periodId } })
  if (!period) throw new Error('Periode tidak ditemukan')

  const priorPeriods = await db.period.findMany({
    where: { startDate: { lt: period.startDate } },
    select: { id: true },
  })

  let saldoAwal = 0
  if (priorPeriods.length > 0) {
    const grouped = await db.transaction.groupBy({
      by: ['type'],
      where: { periodId: { in: priorPeriods.map((p) => p.id) } },
      _sum: { amount: true },
    })
    for (const row of grouped) {
      const amount = Number(row._sum.amount ?? 0)
      if (row.type === 'MASUK') saldoAwal += amount
      else saldoAwal -= amount
    }
  }

  const rows = await db.transaction.findMany({
    where: { periodId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  let running = saldoAwal
  const entries = rows.map((tx, index) => {
    const amount = Number(tx.amount)
    const masuk = tx.type === 'MASUK' ? amount : 0
    const keluar = tx.type === 'KELUAR' ? amount : 0
    running += masuk - keluar
    return {
      id: tx.id,
      no: index + 1,
      tanggal: tx.date,
      description: tx.description,
      kategoriId: tx.category.id,
      kategori: tx.category.name,
      jenis: tx.type,
      masuk,
      keluar,
      saldo: running,
    }
  })

  return { saldoAwal, entries }
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npx vitest run tests/jurnal.test.ts`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add src/lib/jurnal.ts tests/jurnal.test.ts
git commit -m "feat: buildJurnal — fetch periode + carry-forward saldo awal + saldo berjalan"
```

---

### Task 3: Server action `exportJurnal` + `JurnalTable.tsx`

**Files:**
- Modify: `src/app/admin/(dashboard)/kas/laporan/actions.ts`
- Create: `src/app/admin/(dashboard)/kas/laporan/JurnalTable.tsx`
- Test: `tests/jurnal-export.test.ts`

**Interfaces:**
- Consumes: `buildJurnal`, `filterJournal`, `journalToCsv`, `journalToExcelHtml`, `JournalFilter` (Task 1–2)
- Produces:
  - `export async function exportJurnal(format: 'csv'|'excel', params: { periodId: string; filter?: JournalFilter }): Promise<ExportResult>` (tipe `ExportResult` & `ExportFormat` sudah ada di `actions.ts`)
  - `export function JurnalTable(props: { rows: JournalEntry[]; total: number; page: number; pageSize: number; periodId: string; filter: JournalFilter }): JSX.Element`

- [ ] **Step 1: Tulis test yang gagal untuk action**

Buat `tests/jurnal-export.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJurnal } from '@/app/admin/(dashboard)/kas/laporan/actions'

const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  db: {
    period: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
  },
  buildJurnal: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({ requireRole: h.requireRole }))
vi.mock('@/lib/db', () => ({ db: h.db }))
vi.mock('@/lib/jurnal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/jurnal')>()
  return { ...actual, buildJurnal: h.buildJurnal }
})

describe('exportJurnal', () => {
  beforeEach(() => {
    h.requireRole.mockReset()
    h.requireRole.mockResolvedValue({ id: 'u1', name: 'Bendahara', role: 'BENDAHARA' })
    h.db.period.findUnique.mockReset()
    h.db.period.findUnique.mockResolvedValue({
      id: 'p1',
      name: '2026',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 11, 31),
    })
    h.db.category.findUnique.mockReset()
    h.db.category.findUnique.mockResolvedValue({ id: 'c1' })
    h.buildJurnal.mockReset()
    h.buildJurnal.mockResolvedValue({
      saldoAwal: 500_000,
      entries: [
        {
          id: 't1',
          no: 1,
          tanggal: new Date(2026, 9, 1),
          description: 'Infak',
          kategoriId: 'c1',
          kategori: 'Infak',
          jenis: 'MASUK',
          masuk: 100_000,
          keluar: 0,
          saldo: 600_000,
        },
      ],
    })
  })

  it('menolak role tanpa akses', async () => {
    h.requireRole.mockRejectedValue(new Error('Akses ditolak'))
    await expect(exportJurnal('csv', { periodId: 'p1' })).rejects.toThrow('Akses ditolak')
    expect(h.buildJurnal).not.toHaveBeenCalled()
  })

  it('periode tidak ditemukan → ok:false', async () => {
    h.db.period.findUnique.mockResolvedValue(null)
    const result = await exportJurnal('csv', { periodId: 'missing' })
    expect(result).toEqual({ ok: false, error: 'Periode tidak ditemukan' })
  })

  it('kategori tidak ditemukan → ok:false', async () => {
    h.db.category.findUnique.mockResolvedValue(null)
    const result = await exportJurnal('csv', { periodId: 'p1', filter: { categoryId: 'bad' } })
    expect(result).toEqual({ ok: false, error: 'Kategori tidak ditemukan' })
  })

  it('csv sukses: filename, mime, konten memuat saldo akhir 600000', async () => {
    const result = await exportJurnal('csv', { periodId: 'p1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('jurnal-kas-2026.csv')
    expect(result.mime).toBe('text/csv;charset=utf-8')
    expect(result.content).toContain('LAPORAN JURNAL KAS')
    expect(result.content).toContain('600000')
  })

  it('excel sukses: mime xls', async () => {
    const result = await exportJurnal('excel', { periodId: 'p1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('jurnal-kas-2026.xls')
    expect(result.mime).toBe('application/vnd.ms-excel')
  })

  it('filter diteruskan ke filterJournal (hanya baris cocok yang diekspor)', async () => {
    h.buildJurnal.mockResolvedValue({
      saldoAwal: 0,
      entries: [
        {
          id: 'a', no: 1, tanggal: new Date(2026, 9, 1), description: 'Infak',
          kategoriId: 'c1', kategori: 'Infak', jenis: 'MASUK', masuk: 10, keluar: 0, saldo: 10,
        },
        {
          id: 'b', no: 2, tanggal: new Date(2026, 9, 2), description: 'Sosial',
          kategoriId: 'c2', kategori: 'Sosial', jenis: 'KELUAR', masuk: 0, keluar: 5, saldo: 5,
        },
      ],
    })
    const result = await exportJurnal('csv', { periodId: 'p1', filter: { q: 'infak' } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('Infak')
    expect(result.content).not.toContain('Sosial')
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npx vitest run tests/jurnal-export.test.ts`
Expected: FAIL — `exportJurnal` belum ada di `actions.ts`.

- [ ] **Step 3: Implementasi server action**

Tambahkan ke `src/app/admin/(dashboard)/kas/laporan/actions.ts` — impor baru di atas:

```ts
import {
  buildJurnal,
  filterJournal,
  journalToCsv,
  journalToExcelHtml,
  type JournalFilter,
} from '@/lib/jurnal'
```

dan fungsi di akhir file:

```ts
/** Nama file aman `jurnal-kas-<periode>.csv|.xls` — sama dengan fileSlug yang ada. */
function jurnalSlug(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || 'periode'
}

function filterNoteOf(filter: JournalFilter | undefined): string | undefined {
  if (!filter) return undefined
  const parts: string[] = []
  if (filter.q) parts.push(`q "${filter.q}"`)
  if (filter.jenis) parts.push(`jenis ${filter.jenis}`)
  if (filter.dari) parts.push(`dari ${filter.dari}`)
  if (filter.sampai) parts.push(`sampai ${filter.sampai}`)
  return parts.length > 0 ? parts.join('; ') : undefined
}

/**
 * Ekspor jurnal mengikuti baris TERFILTER (bukan potongan halaman yang tampil),
 * dengan kop memuat Saldo Awal & catatan filter — Saldo Akhir tetap invarian.
 */
export async function exportJurnal(
  format: ExportFormat,
  params: { periodId: string; filter?: JournalFilter },
): Promise<ExportResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const period = await db.period.findUnique({
    where: { id: params.periodId },
    select: { name: true, startDate: true, endDate: true },
  })
  if (!period) return { ok: false, error: 'Periode tidak ditemukan' }

  if (params.filter?.categoryId) {
    const category = await db.category.findUnique({
      where: { id: params.filter.categoryId },
      select: { id: true },
    })
    if (!category) return { ok: false, error: 'Kategori tidak ditemukan' }
  }

  try {
    const { saldoAwal, entries } = await buildJurnal(params.periodId)
    const filtered = filterJournal(entries, params.filter ?? {})
    const periodLabel = `Periode ${period.name} (${formatDateID(period.startDate)} – ${formatDateID(period.endDate)})`
    const slug = jurnalSlug(period.name)

    if (format === 'excel') {
      return {
        ok: true,
        filename: `jurnal-kas-${slug}.xls`,
        content: journalToExcelHtml({
          saldoAwal,
          entries: filtered,
          periodLabel,
          ...(filterNoteOf(params.filter) ? { filterNote: filterNoteOf(params.filter)! } : {}),
        }),
        mime: 'application/vnd.ms-excel',
      }
    }
    return {
      ok: true,
      filename: `jurnal-kas-${slug}.csv`,
      content: journalToCsv({
        saldoAwal,
        entries: filtered,
        periodLabel,
        ...(filterNoteOf(params.filter) ? { filterNote: filterNoteOf(params.filter)! } : {}),
      }),
      mime: 'text/csv;charset=utf-8',
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal membuat jurnal' }
  }
}
```

Tambahkan impor `formatDateID` bila belum ada:

```ts
import { formatDateID } from '@/lib/format'
```

- [ ] **Step 4: Jalankan test action — pastikan lulus**

Run: `npx vitest run tests/jurnal-export.test.ts`
Expected: PASS.

- [ ] **Step 5: Buat `JurnalTable.tsx`**

Buat `src/app/admin/(dashboard)/kas/laporan/JurnalTable.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { formatDateID, formatRupiah } from '@/lib/format'
import { exportJurnal, type ExportFormat } from './actions'
import type { JournalEntry, JournalFilter } from '@/lib/jurnal'

const BASE_PATH = '/admin/kas/laporan/jurnal'

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40 disabled:opacity-60'

function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

interface JurnalTableProps {
  rows: JournalEntry[]
  total: number
  page: number
  pageSize: number
  periodId: string
  filter: JournalFilter
}

/**
 * Pembungkus client. Hanya kolom Tanggal yang sortable — kolom Saldo harus
 * tetap runtut, dan nilainya sudah invarian (tidak dihitung ulang saat sort).
 */
export function JurnalTable({
  rows,
  total,
  page,
  pageSize,
  periodId,
  filter,
}: JurnalTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  async function handleExport(format: ExportFormat) {
    setBusy(format)
    setError(null)
    try {
      const result = await exportJurnal(format, { periodId, filter })
      if (result.ok) download(result.filename, result.content, result.mime)
      else setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor jurnal')
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<JournalEntry>[] = [
    {
      key: 'no',
      label: 'No',
      align: 'right',
      render: (row) => <span className="tabular-nums text-neutral-500">{row.no}</span>,
    },
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (row) => formatDateID(row.tanggal),
    },
    { key: 'description', label: 'Keterangan' },
    { key: 'kategori', label: 'Kategori' },
    {
      key: 'jenis',
      label: 'Jenis',
      render: (row) =>
        row.jenis === 'MASUK' ? (
          <span className="font-medium text-green-700">Masuk</span>
        ) : (
          <span className="font-medium text-red-600">Keluar</span>
        ),
    },
    {
      key: 'masuk',
      label: 'Masuk',
      align: 'right',
      render: (row) =>
        row.masuk > 0 ? (
          <span className="text-green-700">{formatRupiah(row.masuk)}</span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'keluar',
      label: 'Keluar',
      align: 'right',
      render: (row) =>
        row.keluar > 0 ? (
          <span className="text-red-600">{formatRupiah(row.keluar)}</span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'saldo',
      label: 'Saldo',
      align: 'right',
      render: (row) => (
        <span className="font-semibold tabular-nums">{formatRupiah(row.saldo)}</span>
      ),
    },
  ]

  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void handleExport('csv')}
        disabled={busy !== null}
        className={toolbarButtonClass}
      >
        {busy === 'csv' ? 'Mengekspor…' : 'Ekspor CSV'}
      </button>
      <button
        type="button"
        onClick={() => void handleExport('excel')}
        disabled={busy !== null}
        className={toolbarButtonClass}
      >
        {busy === 'excel' ? 'Mengekspor…' : 'Ekspor Excel'}
      </button>
      <button type="button" onClick={() => window.print()} className={toolbarButtonClass}>
        Cetak
      </button>
    </div>
  )

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        searchPlaceholder="Cari keterangan / kategori…"
        exportFilename="jurnal-kas"
        basePath={BASE_PATH}
        toolbarExtra={toolbarExtra}
        hideBuiltinActions
      />
    </div>
  )
}
```

- [ ] **Step 6: Verifikasi tsc & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tanpa error.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(dashboard)/kas/laporan/actions.ts" "src/app/admin/(dashboard)/kas/laporan/JurnalTable.tsx" tests/jurnal-export.test.ts
git commit -m "feat: exportJurnal + JurnalTable — kolom Saldo invarian, hanya Tanggal sortable"
```

---

### Task 4: Tab nav + halaman `/admin/kas/laporan/jurnal`

**Files:**
- Create: `src/app/admin/(dashboard)/kas/laporan/LaporanTabs.tsx`
- Create: `src/app/admin/(dashboard)/kas/laporan/jurnal/page.tsx`
- Modify: `src/app/admin/(dashboard)/kas/laporan/page.tsx`

**Interfaces:**
- Consumes: `buildJurnal`, `filterJournal`, `sortJournal`, `journalTotals`, `JournalFilter` (Task 1–2); `JurnalTable` (Task 3)
- Produces: route `/admin/kas/laporan/jurnal`; komponen `LaporanTabs`

- [ ] **Step 1: Buat `LaporanTabs.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/kas/laporan', label: 'Rekap Kategori' },
  { href: '/admin/kas/laporan/jurnal', label: 'Jurnal' },
]

/**
 * Tab nav laporan kas. Dua tampilan dipisah route karena DataTable memakai
 * nama param global (q/page/size/sort/dir) — dua tabel di satu URL berebut.
 */
export function LaporanTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Tampilan laporan kas" className="mb-4 flex gap-1 border-b border-black/10">
      {TABS.map((tab) => {
        const active =
          tab.href === '/admin/kas/laporan'
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'border-b-2 border-green-900 px-4 py-2 text-sm font-semibold text-green-900'
                : 'border-b-2 border-transparent px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800'
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Sambungkan tab ke halaman Rekap yang ada**

Di `src/app/admin/(dashboard)/kas/laporan/page.tsx`, tambah impor:

```ts
import { LaporanTabs } from './LaporanTabs'
```

lalu sisipkan `<LaporanTabs />` tepat setelah pembuka `<div>` pertama pada return, sebelum `<PrintHeader ... />`. Cari blok:

```tsx
  return (
    <div>
      <PrintHeader
```

ganti menjadi:

```tsx
  return (
    <div>
      <div className="no-print">
        <LaporanTabs />
      </div>
      <PrintHeader
```

- [ ] **Step 3: Verifikasi halaman Rekap tidak rusak**

Run: `npx tsc --noEmit && npm run lint`
Expected: tanpa error.

- [ ] **Step 4: Buat halaman jurnal**

Buat `src/app/admin/(dashboard)/kas/laporan/jurnal/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatDateID, formatRupiah } from '@/lib/format'
import { requireRole } from '@/lib/rbac'
import { getSetting } from '@/lib/settings'
import { getTableParams, PAGE_SIZES } from '@/lib/table-query'
import {
  buildJurnal,
  filterJournal,
  journalTotals,
  sortJournal,
  type JournalFilter,
} from '@/lib/jurnal'
import { LaporanTabs } from '../LaporanTabs'
import { JurnalTable } from '../JurnalTable'

export const metadata: Metadata = {
  title: 'Jurnal Kas — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DEFAULT_JURNAL_SIZE = 50

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function JurnalKasPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const { q, page, sort, dir } = getTableParams(sp)
  const periodParam = first(sp.period)
  const categoryParam = first(sp.category)
  const jenisParam = first(sp.jenis)
  const dariParam = first(sp.dari)
  const sampaiParam = first(sp.sampai)
  const urlSize = Number.parseInt(first(sp.size) ?? '', 10)
  const pageSize = (PAGE_SIZES as readonly number[]).includes(urlSize)
    ? urlSize
    : DEFAULT_JURNAL_SIZE

  const [periods, categories, siteNameRaw] = await Promise.all([
    db.period.findMany({ orderBy: { startDate: 'desc' } }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getSetting('site.name', 'Masjid An-nuur Arwana'),
  ])

  if (periodParam && !periods.some((item) => item.id === periodParam)) notFound()
  if (categoryParam && !categories.some((item) => item.id === categoryParam)) notFound()
  if (jenisParam && jenisParam !== 'MASUK' && jenisParam !== 'KELUAR') notFound()

  const selectedPeriod = periodParam
    ? periods.find((item) => item.id === periodParam)
    : (periods.find((item) => item.status === 'AKTIF') ?? periods[0])
  const selectedCategory = categoryParam
    ? categories.find((item) => item.id === categoryParam)
    : undefined

  if (!selectedPeriod) {
    return (
      <div className="no-print">
        <LaporanTabs />
        <h1 className="text-2xl font-semibold text-neutral-900">Jurnal Kas</h1>
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Belum ada periode kas — buka periode dulu di halaman Periode.
        </p>
      </div>
    )
  }

  const { saldoAwal, entries } = await buildJurnal(selectedPeriod.id)

  const jenis = jenisParam === 'MASUK' || jenisParam === 'KELUAR' ? jenisParam : undefined
  const filter: JournalFilter = {
    ...(q ? { q } : {}),
    ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
    ...(jenis ? { jenis } : {}),
    ...(dariParam ? { dari: dariParam } : {}),
    ...(sampaiParam ? { sampai: sampaiParam } : {}),
  }

  const filtered = filterJournal(entries, filter)
  // Hanya Tanggal yang sortable; sort desc = balik urutan kronologis, saldo tidak dihitung ulang.
  const ordered = sortJournal(filtered, sort === 'tanggal' && dir === 'desc' ? 'desc' : 'asc')

  const totals = journalTotals(entries) // invarian — seluruh periode
  const subtotal = journalTotals(filtered) // subtotal terfilter — tidak menggantikan kartu
  const saldoAkhir = saldoAwal + totals.net

  const total = ordered.length
  const start = (page - 1) * pageSize
  const pageRows = ordered.slice(start, start + pageSize)

  const filterActive = Boolean(
    filter.q || filter.categoryId || filter.jenis || filter.dari || filter.sampai,
  )
  const filterNoteParts: string[] = []
  if (filter.q) filterNoteParts.push(`q "${filter.q}"`)
  if (selectedCategory) filterNoteParts.push(`kategori ${selectedCategory.name}`)
  if (jenis) filterNoteParts.push(`jenis ${jenis}`)
  if (dariParam) filterNoteParts.push(`dari ${dariParam}`)
  if (sampaiParam) filterNoteParts.push(`sampai ${sampaiParam}`)

  const siteName =
    typeof siteNameRaw === 'string' ? siteNameRaw : 'Masjid An-nuur Arwana'
  const generatedAt = formatDateID(new Date())
  const controlClass =
    'rounded-md border border-black/10 bg-white px-2 py-2 text-sm text-neutral-700'

  const cards = [
    {
      label: 'Saldo Awal (periode sebelumnya)',
      value: saldoAwal,
      cardClass: 'border-neutral-200 bg-neutral-50',
      valueClass: 'text-neutral-800',
    },
    {
      label: 'Total Masuk',
      value: totals.totalMasuk,
      cardClass: 'border-green-100 bg-green-50',
      valueClass: 'text-green-800',
    },
    {
      label: 'Total Keluar',
      value: totals.totalKeluar,
      cardClass: 'border-red-100 bg-red-50',
      valueClass: 'text-red-700',
    },
    {
      label: 'Saldo Akhir',
      value: saldoAkhir,
      cardClass: 'border-amber-100 bg-amber-50',
      valueClass: 'text-amber-900',
    },
  ] as const

  return (
    <div>
      <div className="no-print">
        <LaporanTabs />

        <h1 className="text-2xl font-semibold text-neutral-900">Jurnal Kas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {`Periode ${selectedPeriod.name} (${formatDateID(selectedPeriod.startDate)} – ${formatDateID(selectedPeriod.endDate)})`}
          {' — dibuat '}
          {generatedAt}
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Periode</span>
            <select name="period" defaultValue={selectedPeriod.id} className={controlClass}>
              {periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.name} (${formatDateID(item.startDate)} – ${formatDateID(item.endDate)})`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Kategori</span>
            <select name="category" defaultValue={categoryParam ?? ''} className={controlClass}>
              <option value="">Semua</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Jenis</span>
            <select name="jenis" defaultValue={jenisParam ?? ''} className={controlClass}>
              <option value="">Semua</option>
              <option value="MASUK">Masuk</option>
              <option value="KELUAR">Keluar</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Dari</span>
            <input
              type="date"
              name="dari"
              defaultValue={dariParam ?? ''}
              className={controlClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">Sampai</span>
            <input
              type="date"
              name="sampai"
              defaultValue={sampaiParam ?? ''}
              className={controlClass}
            />
          </label>

          <button
            type="submit"
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Terapkan
          </button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border p-4 shadow-sm ${card.cardClass}`}
            >
              <p className="text-sm text-neutral-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${card.valueClass}`}>
                {formatRupiah(card.value)}
              </p>
            </div>
          ))}
        </div>

        {filterActive ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-neutral-600">
              Menampilkan <strong>{total}</strong> dari <strong>{entries.length}</strong>{' '}
              entri — Saldo dihitung dari seluruh buku besar.
            </p>
            <p className="text-sm text-neutral-500">
              Subtotal terfilter (bukan kartu di atas): Masuk{' '}
              <span className="font-medium text-green-700">
                {formatRupiah(subtotal.totalMasuk)}
              </span>{' '}
              · Keluar{' '}
              <span className="font-medium text-red-600">
                {formatRupiah(subtotal.totalKeluar)}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <JurnalTable
          rows={pageRows}
          total={total}
          page={page}
          pageSize={pageSize}
          periodId={selectedPeriod.id}
          filter={filter}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verifikasi kompilasi**

Run: `npx tsc --noEmit && npm run lint`
Expected: tanpa error.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(dashboard)/kas/laporan/LaporanTabs.tsx" "src/app/admin/(dashboard)/kas/laporan/jurnal/page.tsx" "src/app/admin/(dashboard)/kas/laporan/page.tsx"
git commit -m "feat: halaman jurnal kas + tab nav di /admin/kas/laporan"
```

---

### Task 5: Verifikasi penuh & e2e

**Files:**
- Test: `tests/e2e/tmp-jurnal.spec.ts` (sementara, dihapus setelah lulus)

- [ ] **Step 1: Jalankan seluruh unit test, tsc, lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: semua lulus, tanpa error. Catat jumlah test sebelum & sesudah.

- [ ] **Step 2: Pastikan dev server hidup**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/login`
Expected: `200`. Bila bukan, jalankan `npm run dev` dan tunggu.

- [ ] **Step 3: Tulis e2e sementara**

Buat `tests/e2e/tmp-jurnal.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@an-nur.local'
const ADMIN_PASSWORD = 'Admin123!'

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.fill('#email', ADMIN_EMAIL)
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.waitForURL('**/admin')
}

async function createTx(page: Page, marker: string, amount: string, jenis: 'MASUK' | 'KELUAR'): Promise<void> {
  await page.goto('/admin/kas/transaksi')
  await page.getByRole('link', { name: '+ Transaksi baru' }).click()
  await page.waitForURL('**edit=new**')
  await page.locator('input[type="date"]').fill('2026-10-15')
  await page.locator(`input[name="type"][value="${jenis}"]`).check()
  await page.getByLabel(/Kategori/).selectOption({ index: 1 })
  await page.getByPlaceholder('Contoh: 150000').fill(amount)
  await page.getByPlaceholder('Contoh: Infak jamaah shalat Jumat').fill(marker)
  await page.getByRole('button', { name: 'Simpan transaksi' }).click()
  await page.waitForURL('**/admin/kas/transaksi')
  await expect(page.getByRole('row', { name: new RegExp(marker) })).toHaveCount(1)
}

async function deleteTx(page: Page, marker: string): Promise<void> {
  await page.goto('/admin/kas/transaksi')
  const row = page.getByRole('row', { name: new RegExp(marker) })
  page.once('dialog', (d) => void d.accept())
  await row.getByRole('button', { name: 'Hapus' }).click()
  await expect(row).toHaveCount(0)
}

const cardValue = async (page: Page, label: string) =>
  (await page.locator(`div:has(> p:text-is("${label}")) p.tabular-nums`).first().innerText()).trim()

test('jurnal: kartu invarian saat filter diaktifkan; saldo akhir = saldo baris terakhir', async ({
  page,
}) => {
  const stamp = Date.now()
  const m1 = `Jurnal masuk ${stamp}`
  const m2 = `Jurnal keluar ${stamp}`

  await login(page)
  await createTx(page, m1, '150000', 'MASUK')
  await createTx(page, m2, '50000', 'KELUAR')

  await page.goto('/admin/kas/laporan/jurnal')
  await expect(page.getByRole('heading', { level: 1, name: 'Jurnal Kas' })).toBeVisible()

  // Tab nav tampil & Rekap bisa diklik
  const tabs = page.getByRole('navigation', { name: 'Tampilan laporan kas' })
  await expect(tabs.getByRole('link', { name: 'Rekap Kategori' })).toBeVisible()

  // Kedua entri tampil + kolom Saldo
  await expect(page.getByRole('row', { name: new RegExp(m1) })).toHaveCount(1)
  await expect(page.getByRole('row', { name: new RegExp(m2) })).toHaveCount(1)
  await expect(page.getByRole('columnheader', { name: 'Saldo' })).toBeVisible()

  // Snapshot kartu (invarian)
  const saldoAwalBefore = await cardValue(page, 'Saldo Awal (periode sebelumnya)')
  const masukBefore = await cardValue(page, 'Total Masuk')
  const keluarBefore = await cardValue(page, 'Total Keluar')
  const akhirBefore = await cardValue(page, 'Saldo Akhir')

  // Aktifkan filter jenis KELUAR → hanya 1 baris tampil, kartu TIDAK berubah
  await page.selectOption('select[name="jenis"]', 'KELUAR')
  await page.getByRole('button', { name: 'Terapkan' }).click()

  await expect(page.getByRole('row', { name: new RegExp(m1) })).toHaveCount(0)
  await expect(page.getByRole('row', { name: new RegExp(m2) })).toHaveCount(1)
  await expect(page.getByText(/Menampilkan \d+ dari \d+ entri/)).toBeVisible()
  await expect(page.getByText('Subtotal terfilter')).toBeVisible()

  expect(await cardValue(page, 'Saldo Awal (periode sebelumnya)')).toBe(saldoAwalBefore)
  expect(await cardValue(page, 'Total Masuk')).toBe(masukBefore)
  expect(await cardValue(page, 'Total Keluar')).toBe(keluarBefore)
  expect(await cardValue(page, 'Saldo Akhir')).toBe(akhirBefore)

  // Bersihkan
  await deleteTx(page, m1)
  await deleteTx(page, m2)
})
```

- [ ] **Step 4: Jalankan e2e**

Run: `E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/tmp-jurnal.spec.ts --reporter=line`
Expected: **1 passed**.

Bila gagal di `selectOption`, pastikan nama option persis `MASUK`/`KELUAR`. Bila kartu berubah, kembalikan ke `journalTotals(entries)` (bukan `journalTotals(filtered)`) untuk kartu.

- [ ] **Step 5: Hapus file e2e sementara**

```bash
rm -f tests/e2e/tmp-jurnal.spec.ts && rm -rf test-results
git status --short
```

Expected: hanya berkas perubahan yang disengaja; tidak ada file e2e sisa.

- [ ] **Step 6: Commit bila ada perbaikan dari e2e**

```bash
git add -A
git commit -m "fix: penyesuaian jurnal kas dari hasil e2e"
```

Bila tidak ada perbaikan, lewati commit ini.

---

## Self-Review

**Spec coverage:**

| Bagian spec | Task |
|---|---|
| §2 Prinsip invarian | Task 1 (`filterJournal`/`sortJournal` tidak sentuh `saldo`), Task 4 (kartu dari `entries` penuh) |
| §3.1 Sub-route + tab nav | Task 4 |
| §3.2 Urutan operasi | Task 2 (`buildJurnal`) + Task 4 (filter→sort→slice) |
| §3.3 Carry-forward | Task 2 |
| §3.4 Saldo berjalan | Task 2 |
| §4 Tabel invarian | Task 1 test + Task 5 e2e |
| §5 Filter/sort | Task 1 (`filterJournal`, `sortJournal`, `parseISODate`) |
| §6 Kolom jurnal | Task 3 (`JurnalTable`) |
| §7 Layout halaman | Task 4 |
| §8 Ekspor/cetak | Task 1 (builder) + Task 3 (action + toolbar) |
| §9 File & tanpa migrasi | seluruh task |
| §10 API | Task 1–2 |
| §11 Akses & keamanan | Task 3 (`requireRole`) + Task 4 (`requireRole`, `notFound`) |
| §12 Testing | Task 1, 2, 3, 5 |

**Type consistency:** `JournalEntry.kategoriId` dipakai `filterJournal` (Task 1) dan dipenuhi `buildJurnal` (Task 2). `JournalTotals.net` dipakai Task 4 (`saldoAwal + totals.net`). `JournalFilter` dipakai Task 3–4 dengan nama & tipe identik. `ExportFormat`/`ExportResult` memakai yang sudah ada di `actions.ts`.
