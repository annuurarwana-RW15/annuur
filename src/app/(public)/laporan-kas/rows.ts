export interface PublicLaporanRow {
  categoryId: string
  categoryName: string
  masuk: number
  keluar: number
  saldo: number
  terbarik: string | null
}

const SORT_KEYS = [
  'categoryName',
  'masuk',
  'keluar',
  'saldo',
  'terbarik',
] as const

export type LaporanSortKey = (typeof SORT_KEYS)[number]

export interface TableControls {
  q: string
  page: number
  size: number
  sort?: string
  dir?: 'asc' | 'desc'
}

function compareValue(
  a: PublicLaporanRow,
  b: PublicLaporanRow,
  key: LaporanSortKey,
  direction: 1 | -1,
): number {
  if (key === 'categoryName') {
    return a.categoryName.localeCompare(b.categoryName, 'id') * direction
  }
  if (key === 'terbarik') {
    // null (belum pernah ada transaksi) selalu di akhir, arah sort diabaikan.
    if (a.terbarik === null && b.terbarik === null) return 0
    if (a.terbarik === null) return 1
    if (b.terbarik === null) return -1
    return a.terbarik.localeCompare(b.terbarik) * direction
  }
  return (a[key] - b[key]) * direction
}

/**
 * Terapkan kontrol DataTable (search `q`, `sort`/`dir`, `page`/`size`) pada
 * ringkasan per kategori. Row count kecil → filter/sort/paginate di memori.
 */
export function applyTableControls(
  rows: PublicLaporanRow[],
  params: TableControls,
): { rows: PublicLaporanRow[]; total: number } {
  const query = params.q.trim().toLowerCase()
  const list = query
    ? rows.filter((row) => row.categoryName.toLowerCase().includes(query))
    : [...rows]

  const sortKey = SORT_KEYS.find((key) => key === params.sort)
  if (sortKey) {
    const direction: 1 | -1 = params.dir === 'desc' ? -1 : 1
    list.sort((a, b) => compareValue(a, b, sortKey, direction))
  }

  const total = list.length
  const start = (Math.max(1, params.page) - 1) * params.size
  return { rows: list.slice(start, start + params.size), total }
}

/** Satu baris ringkasan per kategori, sebelum `terbarik` diubah jadi ISO string. */
export interface CategorySummary {
  categoryId: string
  categoryName: string
  masuk: number
  keluar: number
  saldo: number
  terbarik: Date | null
}

/**
 * Pilih kategori yang boleh tampil di laporan publik.
 *
 * Setting `kas.publicCategories` bisa berisi ID atau nama kategori (fallback
 * lama memakai nama). Bila kosong → semua kategori MASUK aktif.
 */
export function resolvePublicCatIds(
  configured: string[] | undefined | null,
  allCategories: { id: string; name: string; type: 'MASUK' | 'KELUAR' }[],
): string[] {
  if (!configured || configured.length === 0) {
    return allCategories.filter((c) => c.type === 'MASUK').map((c) => c.id)
  }
  const keys = configured.map((key) => String(key))
  return allCategories
    .filter((c) => keys.includes(c.id) || keys.includes(c.name))
    .map((c) => c.id)
}

/**
 * Ringkas transaksi per kategori. Kategori yang dipilih tapi tak punya
 * transaksi tetap muncul dengan nol — agar tabel tidak berubah drastis
 * ketika periode masih kosong.
 */
export function categorySummary(
  catIds: string[],
  transactions: {
    type: 'MASUK' | 'KELUAR'
    amount: unknown
    createdAt: Date
    category: { id: string; name: string }
  }[],
  names: Map<string, string>,
): CategorySummary[] {
  const map = new Map(
    catIds.map((id) => [id, { masuk: 0, keluar: 0, terbarik: null as Date | null }]),
  )

  for (const tx of transactions) {
    const entry = map.get(tx.category.id)
    if (!entry) continue
    const amount = Number(tx.amount)
    if (tx.type === 'MASUK') entry.masuk += amount
    else entry.keluar += amount
    if (!entry.terbarik || tx.createdAt > entry.terbarik) {
      entry.terbarik = tx.createdAt
    }
  }

  return catIds.map((id) => {
    const entry = map.get(id)!
    return {
      categoryId: id,
      categoryName: names.get(id) ?? '—',
      masuk: entry.masuk,
      keluar: entry.keluar,
      saldo: entry.masuk - entry.keluar,
      terbarik: entry.terbarik,
    }
  })
}

/** Satu baris daftar transaksi publik (bukan ringkasan kategori). */
export interface PublicTransactionRow {
  id: string
  /** Tanggal transaksi, format YYYY-MM-DD. */
  tanggal: string
  jenis: 'MASUK' | 'KELUAR'
  kategoriName: string
  nominal: number
  /** Keterangan aman-publik: TIDAK pernah memuat nama donatur. */
  keterangan: string | null
  receiptImage: string | null
}

const TX_SORT_KEYS = [
  'tanggal',
  'jenis',
  'kategoriName',
  'nominal',
  'keterangan',
] as const

export type TransactionSortKey = (typeof TX_SORT_KEYS)[number]

/**
 * Keterangan aman untuk publik.
 *
 * Transaksi yang lahir dari donasi terverifikasi punya `description` otomatis
 * berisi nama donatur (`Donasi <nama> (<ref>)`) → JANGAN ditampilkan; ganti
 * dengan label generik. Entri kas manual (`donationId` null) diisi admin dan
 * aman ditampilkan apa adanya.
 */
export function publicKeterangan(
  description: string,
  donationId: string | null,
): string | null {
  if (donationId) return 'Donasi terverifikasi'
  const text = description.trim()
  return text || null
}

function txCompareValue(
  a: PublicTransactionRow,
  b: PublicTransactionRow,
  key: TransactionSortKey,
  direction: 1 | -1,
): number {
  if (key === 'kategoriName') {
    return a.kategoriName.localeCompare(b.kategoriName, 'id') * direction
  }
  if (key === 'nominal') {
    return (a.nominal - b.nominal) * direction
  }
  if (key === 'keterangan') {
    // null selalu di akhir, arah sort diabaikan.
    if (a.keterangan === null && b.keterangan === null) return 0
    if (a.keterangan === null) return 1
    if (b.keterangan === null) return -1
    return a.keterangan.localeCompare(b.keterangan, 'id') * direction
  }
  // tanggal (YYYY-MM-DD) & jenis: perbandingan string sudah benar secara leksikografis.
  return String(a[key]).localeCompare(String(b[key])) * direction
}

/**
 * Terapkan kontrol DataTable (search `q`, `sort`/`dir`, `page`/`size`) pada
 * daftar transaksi. `q` mencocokkan kategori DAN keterangan (case-insensitive).
 */
export function applyTransactionControls(
  rows: PublicTransactionRow[],
  params: TableControls,
): { rows: PublicTransactionRow[]; total: number } {
  const query = params.q.trim().toLowerCase()
  const list = query
    ? rows.filter(
        (row) =>
          row.kategoriName.toLowerCase().includes(query) ||
          (row.keterangan ?? '').toLowerCase().includes(query),
      )
    : [...rows]

  const sortKey = TX_SORT_KEYS.find((key) => key === params.sort)
  if (sortKey) {
    const direction: 1 | -1 = params.dir === 'desc' ? -1 : 1
    list.sort((a, b) => txCompareValue(a, b, sortKey, direction))
  }

  const total = list.length
  const start = (Math.max(1, params.page) - 1) * params.size
  return { rows: list.slice(start, start + params.size), total }
}
