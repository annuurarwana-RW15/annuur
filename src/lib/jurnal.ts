import { buildCsv, excelText } from '@/lib/table-query'
import { db } from '@/lib/db'

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
  /**
   * Saldo akhir SELURUH periode (saldoAwal + net buku besar penuh).
   * Eksplisit di tipe agar TIDAK pernah diturunkan dari `entries` yang bisa
   * terfilter — invarian spec §2.
   */
  saldoAkhir: number
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

function saldoAkhirOf(ctx: JournalExportContext): number {
  // Invarian: dari konteks, bukan dari ctx.entries (yang bisa terfilter).
  return ctx.saldoAkhir
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
    ...(ctx.filterNote
      ? [`Filter;${ctx.filterNote}`, 'Saldo dihitung dari seluruh buku besar.']
      : []),
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
      ? `<tr><td colspan="8">Filter: ${excelText(ctx.filterNote)}</td></tr>` +
        `<tr><td colspan="8">Saldo dihitung dari seluruh buku besar.</td></tr>`
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
