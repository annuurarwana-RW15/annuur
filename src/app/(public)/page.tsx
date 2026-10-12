import { db } from '@/lib/db'
import { FinanceSummary } from '@/components/public/FinanceSummary'
import { LatestNews } from '@/components/public/LatestNews'
import { SectionRenderer } from '@/components/public/SectionRenderer'

export const revalidate = 60

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
  if (period) {
    const grouped = await db.transaction.groupBy({
      by: ['type'],
      where: { periodId: period.id },
      _sum: { amount: true },
    })
    const totals = new Map(grouped.map((row) => [row.type, Number(row._sum.amount ?? 0)]))
    saldo = (totals.get('MASUK') ?? 0) - (totals.get('KELUAR') ?? 0)
  }

  return (
    <>
      <SectionRenderer sections={sections} />
      <LatestNews articles={articles} />
      <FinanceSummary saldo={saldo} />
    </>
  )
}
