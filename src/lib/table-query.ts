export interface TableParams {
  q: string
  page: number
  size: number
  sort?: string
  dir?: 'asc' | 'desc'
}

export const PAGE_SIZES = [20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_PAGE = 1

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function getTableParams(
  sp: Record<string, string | string[] | undefined>,
): TableParams {
  const q = first(sp.q)

  const pageRaw = Number.parseInt(first(sp.page) ?? '', 10)
  const page =
    Number.isFinite(pageRaw) && pageRaw >= DEFAULT_PAGE ? pageRaw : DEFAULT_PAGE

  const sizeRaw = Number.parseInt(first(sp.size) ?? '', 10)
  const size = (PAGE_SIZES as readonly number[]).includes(sizeRaw)
    ? sizeRaw
    : DEFAULT_PAGE_SIZE

  const sort = first(sp.sort)
  const rawDir = first(sp.dir)
  const dir = rawDir === 'asc' || rawDir === 'desc' ? rawDir : undefined

  return { q: q ?? '', page, size, sort: sort || undefined, dir }
}

function escapeCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** UTF-8 BOM + delimiter `;` (id-ID Excel) + angka polos. */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCell).join(';'))
  return `\uFEFF${lines.join('\n')}\n`
}

export type HrefPatch = Record<string, string | number | null | undefined>

/** Bangun href `basePath?…` dari search params sekarang + perubahan (nilai kosong menghapus). */
export function buildTableHref(
  basePath: string,
  current: URLSearchParams,
  patch: HrefPatch,
): string {
  const params = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '') params.delete(key)
    else params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export type PageItem = number | '…'

/** Pola 1 … 4 5 6 … 20 — selalu 1 & total, current ±1, elipsis di sela yang jauh. */
export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 1) return [1]
  const pages = new Set<number>([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const items: PageItem[] = []
  let prev = 0
  for (const pageNumber of sorted) {
    if (prev > 0 && pageNumber - prev > 1) items.push('…')
    items.push(pageNumber)
    prev = pageNumber
  }
  return items
}
