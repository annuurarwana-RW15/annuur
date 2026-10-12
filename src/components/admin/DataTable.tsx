'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildCsv, buildTableHref, getPageItems, PAGE_SIZES } from '@/lib/table-query'
import type { HrefPatch } from '@/lib/table-query'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right'
  render?: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  searchPlaceholder?: string
  exportFilename?: string
  toolbarExtra?: React.ReactNode
  /** Sembunyikan Export dropdown & Print bawaan (toolbar punya aksi sendiri). */
  hideBuiltinActions?: boolean
  basePath: string
}

type CellValue = string | number

function rawValue(row: unknown, key: string): unknown {
  return (row as Record<string, unknown> | null)?.[key]
}

function displayCell(row: unknown, key: string): React.ReactNode {
  const value = rawValue(row, key)
  if (value == null) return ''
  if (value instanceof Date) return value.toLocaleDateString('id-ID')
  if (typeof value === 'object') return ''
  return String(value)
}

function exportCell(row: unknown, key: string): CellValue {
  const value = rawValue(row, key)
  if (typeof value === 'number') return Number.isFinite(value) ? value : ''
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  return ''
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const toolbarButtonClass =
  'inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'

export function DataTable<T>(props: DataTableProps<T>): React.JSX.Element {
  const {
    columns,
    data,
    total,
    page,
    pageSize,
    basePath,
    searchPlaceholder = 'Cari…',
    exportFilename = 'export',
    toolbarExtra,
    hideBuiltinActions = false,
  } = props

  const router = useRouter()
  const searchParams = useSearchParams()

  const href = React.useCallback(
    (patch: HrefPatch) => buildTableHref(basePath, searchParams, patch),
    [basePath, searchParams],
  )

  const sortKey = searchParams.get('sort') ?? undefined
  const rawDir = searchParams.get('dir')
  const sortDir: 'asc' | 'desc' | undefined =
    rawDir === 'asc' || rawDir === 'desc' ? rawDir : undefined

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const current = Math.min(Math.max(page, 1), totalPages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  return (
    <div className="w-full">
      <div className="no-print flex flex-wrap items-center gap-2 py-3">
        <SearchInput placeholder={searchPlaceholder} href={href} />
        {toolbarExtra}
        {hideBuiltinActions ? null : (
          <>
            <ExportMenu columns={columns} data={data} filename={exportFilename} />
            <button type="button" onClick={() => window.print()} className={toolbarButtonClass}>
              Print
            </button>
          </>
        )}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            {columns.map((col) => {
              const active = Boolean(col.sortable) && sortKey === col.key
              const nextDir: 'asc' | 'desc' | undefined = !col.sortable
                ? undefined
                : active
                  ? sortDir === 'asc'
                    ? 'desc'
                    : sortDir === 'desc'
                      ? undefined
                      : 'asc'
                  : 'asc'
              const sortHref = href(
                nextDir ? { sort: col.key, dir: nextDir } : { sort: undefined, dir: undefined },
              )
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : col.sortable
                        ? 'none'
                        : undefined
                  }
                  className={`border-b border-black/10 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.sortable ? (
                    <Link
                      href={sortHref}
                      className="inline-flex items-center gap-1 hover:text-green-900"
                    >
                      {col.label}
                      <span aria-hidden className={active ? 'text-green-900' : 'text-neutral-400'}>
                        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </Link>
                  ) : (
                    col.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-neutral-500"
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-black/[0.03]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-b border-black/5 px-4 py-2.5 ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    }`}
                  >
                    {col.render ? col.render(row) : displayCell(row, col.key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <nav
        aria-label="Navigasi halaman"
        className="no-print flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-neutral-600"
      >
        <p>{`Menampilkan ${from}–${to} dari ${total}`}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Baris / halaman</span>
            <select
              value={pageSize}
              onChange={(event) =>
                router.replace(href({ size: event.target.value, page: 1 }))
              }
              className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-neutral-700"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            {current > 1 ? (
              <Link
                href={href({ page: current - 1 })}
                aria-label="Halaman sebelumnya"
                className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 hover:bg-neutral-50"
              >
                ‹
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Halaman sebelumnya"
                className="rounded-md border border-black/5 px-2.5 py-1.5 text-neutral-300"
              >
                ‹
              </button>
            )}

            {getPageItems(current, totalPages).map((item, index) =>
              typeof item === 'string' ? (
                <span key={`gap-${index}`} className="px-1 text-neutral-400">
                  …
                </span>
              ) : item === current ? (
                <span
                  key={item}
                  aria-current="page"
                  className="rounded-md bg-green-900 px-2.5 py-1.5 font-semibold text-white"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={href({ page: item })}
                  className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 hover:bg-neutral-50"
                >
                  {item}
                </Link>
              ),
            )}

            {current < totalPages ? (
              <Link
                href={href({ page: current + 1 })}
                aria-label="Halaman berikutnya"
                className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 hover:bg-neutral-50"
              >
                ›
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Halaman berikutnya"
                className="rounded-md border border-black/5 px-2.5 py-1.5 text-neutral-300"
              >
                ›
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}

function SearchInput({
  placeholder,
  href,
}: {
  placeholder: string
  href: (patch: HrefPatch) => string
}): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [value, setValue] = React.useState(urlQuery)
  const mounted = React.useRef(false)

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (value === urlQuery) return
    const timeout = window.setTimeout(() => {
      router.replace(href({ q: value || undefined, page: 1 }))
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [value, urlQuery, href, router])

  const clear = () => {
    setValue('')
    router.replace(href({ q: undefined, page: 1 }))
  }

  return (
    <div className="relative min-w-44 flex-1 sm:max-w-72">
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-md border border-black/10 bg-white py-2 pl-3 pr-9 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40"
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label="Bersihkan pencarian"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}

function ExportMenu<T>({
  columns,
  data,
  filename,
}: {
  columns: Column<T>[]
  data: T[]
  filename: string
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const headers = columns.map((col) => col.label)
  const rows = data.map((row) => columns.map((col) => exportCell(row, col.key)))

  const exportCsv = () => {
    const csv = buildCsv(headers, rows)
    downloadBlob(
      `${filename}.csv`,
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    setOpen(false)
  }

  const exportExcel = () => {
    const headerRow = headers.map((label) => `<th>${escapeHtml(label)}</th>`).join('')
    const bodyRows = rows
      .map(
        (cells) =>
          `<tr>${cells.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`,
      )
      .join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8" /></head><body><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`
    downloadBlob(
      `${filename}.xls`,
      new Blob([html], { type: 'application/vnd.ms-excel' }),
    )
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`${toolbarButtonClass} border-green-900 bg-green-900 text-white hover:bg-green-800`}
      >
        Export
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-black/10 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={exportCsv}
            className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
          >
            CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={exportExcel}
            className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Excel
          </button>
        </div>
      ) : null}
    </div>
  )
}
