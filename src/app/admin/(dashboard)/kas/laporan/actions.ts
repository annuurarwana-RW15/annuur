'use server'

import { db } from '@/lib/db'
import { formatDateID } from '@/lib/format'
import {
  buildJurnal,
  filterJournal,
  journalToCsv,
  journalToExcelHtml,
  type JournalFilter,
} from '@/lib/jurnal'
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

/** Nama file aman `jurnal-kas-<periode>.csv|.xls` — sama dengan fileSlug yang ada. */
function jurnalSlug(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || 'periode'
}

function filterNoteOf(
  filter: JournalFilter | undefined,
  categoryName?: string,
): string | undefined {
  if (!filter) return undefined
  const parts: string[] = []
  if (filter.q) parts.push(`q "${filter.q}"`)
  if (filter.jenis) parts.push(`jenis ${filter.jenis}`)
  if (filter.dari) parts.push(`dari ${filter.dari}`)
  if (filter.sampai) parts.push(`sampai ${filter.sampai}`)
  if (filter.categoryId) parts.push(`kategori ${categoryName ?? filter.categoryId}`)
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

  let categoryName: string | undefined
  if (params.filter?.categoryId) {
    const category = await db.category.findUnique({
      where: { id: params.filter.categoryId },
      select: { id: true, name: true },
    })
    if (!category) return { ok: false, error: 'Kategori tidak ditemukan' }
    categoryName = category.name
  }

  try {
    const { saldoAwal, entries } = await buildJurnal(params.periodId)
    const filtered = filterJournal(entries, params.filter ?? {})
    const periodLabel = `Periode ${period.name} (${formatDateID(period.startDate)} – ${formatDateID(period.endDate)})`
    const slug = jurnalSlug(period.name)
    const filterNote = filterNoteOf(params.filter, categoryName)

    if (format === 'excel') {
      return {
        ok: true,
        filename: `jurnal-kas-${slug}.xls`,
        content: journalToExcelHtml({
          saldoAwal,
          entries: filtered,
          periodLabel,
          ...(filterNote ? { filterNote } : {}),
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
        ...(filterNote ? { filterNote } : {}),
      }),
      mime: 'text/csv;charset=utf-8',
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal membuat jurnal' }
  }
}
