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
