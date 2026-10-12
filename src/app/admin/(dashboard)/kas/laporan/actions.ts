'use server'

import { db } from '@/lib/db'
import { buildKasReport, reportToCsv, reportToExcelHtml } from '@/lib/report'
import { requireRole } from '@/lib/rbac'

export type ExportFormat = 'csv' | 'excel'
export type ExportParams = { periodId: string; categoryId?: string }
export type ExportResult =
  | { ok: true; filename: string; content: string; mime: string }
  | { ok: false; error: string }

/** Nama file aman: `laporan-kas-<periode>.csv|.xls`. */
function fileSlug(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || 'periode'
}

export async function exportKasReport(
  format: ExportFormat,
  params: ExportParams,
): Promise<ExportResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const period = await db.period.findUnique({
    where: { id: params.periodId },
    select: { name: true },
  })
  if (!period) return { ok: false, error: 'Periode tidak ditemukan' }

  if (params.categoryId) {
    const category = await db.category.findUnique({
      where: { id: params.categoryId },
      select: { id: true },
    })
    if (!category) return { ok: false, error: 'Kategori tidak ditemukan' }
  }

  try {
    const report = await buildKasReport({
      periodId: params.periodId,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    })
    const slug = fileSlug(period.name)

    if (format === 'excel') {
      return {
        ok: true,
        filename: `laporan-kas-${slug}.xls`,
        content: reportToExcelHtml(report),
        mime: 'application/vnd.ms-excel',
      }
    }
    return {
      ok: true,
      filename: `laporan-kas-${slug}.csv`,
      content: reportToCsv(report),
      mime: 'text/csv;charset=utf-8',
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal membuat laporan' }
  }
}
