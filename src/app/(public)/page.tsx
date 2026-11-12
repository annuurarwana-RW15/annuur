import type { Section } from '@prisma/client'
import { db } from '@/lib/db'
import { buildDailyMonthSeries } from '@/lib/kas-daily'
import { getQris } from '@/lib/qris'
import { getAllSurahs } from '@/lib/quran'
import { ensureDefaultSections } from '@/lib/sections-init'
import { FinanceSummary } from '@/components/public/FinanceSummary'
import { LatestNews } from '@/components/public/LatestNews'
import { QuranMurottalSection } from '@/components/public/QuranMurottalSection'
import { SectionRenderer } from '@/components/public/SectionRenderer'

export const revalidate = 60

export default async function BerandaPage() {
  let sections: Section[] = []
  let articles: Array<{
    title: string
    slug: string
    excerpt: string | null
    coverImage: string | null
    publishedAt: Date | null
    category?: string | null
  }> = []
  let period: { id: string } | null = null
  let qris: Awaited<ReturnType<typeof getQris>> = null

  try {
    await ensureDefaultSections().catch(() => {})
    const res = await Promise.all([
      db.section.findMany({
        where: { isVisible: true, key: { not: 'footer' } },
        orderBy: { order: 'asc' },
      }),
      db.article.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          publishedAt: true,
          category: true,
        },
      }),
      db.period.findFirst({
        where: { status: 'AKTIF' },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      }),
      getQris(),
    ])
    sections = res[0]
    articles = res[1]
    period = res[2]
    qris = res[3]
  } catch (error) {
    console.error('[BerandaPage] Gagal memuat data awal beranda:', error)
  }

  let saldo: number | null = null
  // Deret harian bulan berjalan selalu tersedia (seri kosong bila tanpa periode)
  // agar kartu chart tetap tampil dengan empty state yang benar.
  let daily = buildDailyMonthSeries([])
  if (period) {
    try {
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
    } catch (error) {
      console.error('[BerandaPage] Gagal memuat data keuangan beranda:', error)
    }
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

  const hasPengumumanSection = sections.some((s) => s.key === 'pengumuman')
  const surahs = getAllSurahs()

  return (
    <>
      <SectionRenderer sections={beforeFinance} articles={articles} />
      <FinanceSummary saldo={saldo} daily={daily} qris={qris} />
      <QuranMurottalSection surahs={surahs} />
      <SectionRenderer sections={afterFinance} articles={articles} />
      {!hasPengumumanSection && <LatestNews articles={articles} />}
      {testimoni && <SectionRenderer sections={[testimoni]} />}
    </>
  )
}
