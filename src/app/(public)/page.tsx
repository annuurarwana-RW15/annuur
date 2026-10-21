import type { Section } from '@prisma/client'
import { db } from '@/lib/db'
import { buildDailyMonthSeries } from '@/lib/kas-daily'
import { FinanceSummary } from '@/components/public/FinanceSummary'
import { LatestNews } from '@/components/public/LatestNews'
import { SectionRenderer } from '@/components/public/SectionRenderer'

export const revalidate = 86400

export default async function BerandaPage() {
  const [sections, articles, period] = await Promise.all([
    db.section.findMany({
      where: { isVisible: true, key: { not: 'footer' } },
      orderBy: { order: 'asc' },
    }),
    db.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 3,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    }),
    db.period.findFirst({
      where: { status: 'AKTIF' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
  ])

  let saldo: number | null = null
  // Deret harian bulan berjalan selalu tersedia (seri kosong bila tanpa periode)
  // agar kartu chart tetap tampil dengan empty state yang benar.
  let daily = buildDailyMonthSeries([])
  if (period) {
    const [grouped, txRows] = await Promise.all([
      db.transaction.groupBy({
        by: ['type'],
        where: { periodId: period.id },
        _sum: { amount: true },
      }),
      db.transaction.findMany({
        where: { periodId: period.id },
        select: { date: true, type: true, amount: true },
      }),
    ])
    const totals = new Map(grouped.map((row) => [row.type, Number(row._sum.amount ?? 0)]))
    saldo = (totals.get('MASUK') ?? 0) - (totals.get('KELUAR') ?? 0)
    daily = buildDailyMonthSeries(
      txRows.map((row) => ({
        date: row.date,
        type: row.type,
        amount: Number(row.amount),
      })),
    )
  }

  // Posisi tetap di luar urutan DB:
  // - Laporan Keuangan tepat setelah section `jumat` (bila jumat disembunyikan → setelah semua section).
  // - Testimoni selalu block terakhir sebelum footer.
  const testimoni = sections.find((s) => s.key === 'testimoni') ?? null
  const mainSections = sections.filter((s) => s.key !== 'testimoni')
  const jumatIndex = mainSections.findIndex((s) => s.key === 'jumat')

  let beforeFinance: Section[]
  let afterFinance: Section[]
  if (jumatIndex >= 0) {
    beforeFinance = mainSections.slice(0, jumatIndex + 1)
    afterFinance = mainSections.slice(jumatIndex + 1)
  } else {
    beforeFinance = mainSections
    afterFinance = []
  }

  return (
    <>
      <SectionRenderer sections={beforeFinance} />
      <FinanceSummary saldo={saldo} daily={daily} />
      <SectionRenderer sections={afterFinance} />
      <LatestNews articles={articles} />
      {testimoni && <SectionRenderer sections={[testimoni]} />}
    </>
  )
}
