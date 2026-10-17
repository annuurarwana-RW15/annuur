import { db } from '@/lib/db'
import { formatDateID } from '@/lib/format'
import { buildCsv, excelText } from '@/lib/table-query'

export const KAS_REPORT_TITLE = 'LAPORAN KEUANGAN MASJID'

export interface ReportTotals {
  masuk: number
  keluar: number
  saldo: number
}

export interface KasReportRow {
  kategori: string
  masuk: number
  keluar: number
  saldo: number
}

export interface KasReport {
  title: string
  periodLabel: string
  rows: KasReportRow[]
  total: ReportTotals
}

/**
 * Laporan keuangan per periode: agregat `groupBy(['type','categoryId'])` —
 * hanya kategori yang punya transaksi (masuk ATAU keluar > 0) yang tampil,
 * termasuk kategori nonaktif yang masih menyimpan riwayat transaksi.
 * Saldo tidak pernah dibaca dari kolom: `masuk - keluar` dihitung di sini.
 */
export async function buildKasReport(opts: {
  periodId: string
  categoryId?: string
}): Promise<KasReport> {
  const period = await db.period.findUnique({ where: { id: opts.periodId } })
  if (!period) throw new Error('Periode tidak ditemukan')

  const grouped = await db.transaction.groupBy({
    by: ['type', 'categoryId'],
    where: {
      periodId: opts.periodId,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    },
    _sum: { amount: true },
  })

  const categoryIds = [...new Set(grouped.map((row) => row.categoryId))]
  const categories = categoryIds.length
    ? await db.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(categories.map((category) => [category.id, category.name]))

  const perCategory = new Map<string, KasReportRow>()
  for (const group of grouped) {
    const row =
      perCategory.get(group.categoryId) ??
      ({
        kategori: nameById.get(group.categoryId) ?? 'Tanpa kategori',
        masuk: 0,
        keluar: 0,
        saldo: 0,
      } satisfies KasReportRow)
    const amount = Number(group._sum.amount ?? 0)
    if (group.type === 'MASUK') row.masuk += amount
    else row.keluar += amount
    row.saldo = row.masuk - row.keluar
    perCategory.set(group.categoryId, row)
  }

  const rows = [...perCategory.values()].sort((a, b) =>
    a.kategori.localeCompare(b.kategori, 'id'),
  )
  const total = rows.reduce<ReportTotals>(
    (acc, row) => ({
      masuk: acc.masuk + row.masuk,
      keluar: acc.keluar + row.keluar,
      saldo: acc.saldo + row.saldo,
    }),
    { masuk: 0, keluar: 0, saldo: 0 },
  )

  return {
    title: KAS_REPORT_TITLE,
    periodLabel: `Periode ${period.name} (${formatDateID(period.startDate)} – ${formatDateID(period.endDate)})`,
    rows,
    total,
  }
}

/** CSV id-ID: BOM + `;` + angka polos (tanpa `Rp`) — warisan `buildCsv`. */
export function reportToCsv(report: KasReport): string {
  return buildCsv(
    ['Kategori', 'Masuk', 'Keluar', 'Saldo'],
    [
      ...report.rows.map(
        (row) => [row.kategori, row.masuk, row.keluar, row.saldo] as (string | number)[],
      ),
      ['TOTAL', report.total.masuk, report.total.keluar, report.total.saldo],
    ],
  )
}

/** HTML table untuk Blob `application/vnd.ms-excel` — kop laporan di baris pertama. */
export function reportToExcelHtml(report: KasReport): string {
  const head =
    `<tr><th colspan="4" style="text-align:left">${excelText(report.title)}</th></tr>` +
    `<tr><td colspan="4">${excelText(report.periodLabel)}</td></tr>` +
    '<tr><th>Kategori</th><th>Masuk</th><th>Keluar</th><th>Saldo</th></tr>'
  const body = report.rows
    .map(
      (row) =>
        `<tr><td>${excelText(row.kategori)}</td><td>${row.masuk}</td><td>${row.keluar}</td><td>${row.saldo}</td></tr>`,
    )
    .join('')
  const foot = `<tr><td>TOTAL</td><td>${report.total.masuk}</td><td>${report.total.keluar}</td><td>${report.total.saldo}</td></tr>`
  return (
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    '<head><meta charset="UTF-8" /></head><body><table>' +
    `<thead>${head}</thead><tbody>${body}${foot}</tbody>` +
    '</table></body></html>'
  )
}

type ReportSortKey = 'kategori' | 'masuk' | 'keluar' | 'saldo'

/** Sort server-side kolom laporan — key sama dengan `Column.key` di tabel. */
export function sortReportRows(
  rows: KasReportRow[],
  sort: string | undefined,
  dir: 'asc' | 'desc' | undefined,
): KasReportRow[] {
  if (sort !== 'kategori' && sort !== 'masuk' && sort !== 'keluar' && sort !== 'saldo') {
    return rows
  }
  const factor = dir === 'desc' ? -1 : 1
  const key: ReportSortKey = sort
  return [...rows].sort((a, b) => {
    if (key === 'kategori') return a.kategori.localeCompare(b.kategori, 'id') * factor
    return (a[key] - b[key]) * factor
  })
}
