import type { Section } from '@prisma/client'
import { db } from '@/lib/db'
import { buildDailyMonthSeries } from '@/lib/kas-daily'
import { getQris } from '@/lib/qris'
import { getAllSurahs } from '@/lib/quran'
import { ensureDefaultSections } from '@/lib/sections-init'
import { getSetting } from '@/lib/settings'
import { getWhatsAppNumber } from '@/lib/whatsapp-server'
import { DonationSection, type RekeningDisplayItem } from '@/components/public/DonationSection'
import { FeaturedProposalSection } from '@/components/public/FeaturedProposalSection'
import { FinanceSummary } from '@/components/public/FinanceSummary'
import { LatestNews } from '@/components/public/LatestNews'
import { QuranMurottalSection } from '@/components/public/QuranMurottalSection'
import { SectionRenderer } from '@/components/public/SectionRenderer'
import { getAllProposals, calculateProposalFunding } from '@/lib/proposal'
import type { ProposalWithFunding } from '@/components/public/ProposalCard'

export const revalidate = 60

function parseRekening(value: unknown): RekeningDisplayItem[] {
  if (!Array.isArray(value)) return []
  const items: RekeningDisplayItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const bank = typeof rec.bank === 'string' ? rec.bank.trim() : ''
    const no = typeof rec.no === 'string' ? rec.no.trim() : ''
    const atasNama =
      (typeof rec.atasNama === 'string' && rec.atasNama.trim()) ||
      (typeof rec['a.n.'] === 'string' && rec['a.n.'].trim()) ||
      (typeof rec.an === 'string' && rec.an.trim()) ||
      'Masjid An-nuur Arwana'
    if (bank && no) {
      items.push({ bank, no, atasNama, link: typeof rec.link === 'string' ? rec.link : null })
    }
  }
  return items
}

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
  let rekening: RekeningDisplayItem[] = []
  let whatsapp = ''
  let featuredProposals: ProposalWithFunding[] = []

  try {
    await ensureDefaultSections().catch(() => {})
    const [rawSections, rawArticles, rawPeriod, rawQris, rawRekening, rawWhatsapp, rawProposals] = await Promise.all([
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
      getSetting<unknown>('donasi.rekening', []),
      getWhatsAppNumber(),
      getAllProposals({ featuredOnly: true, status: 'ALL' }).catch(() => []),
    ])
    sections = rawSections
    articles = rawArticles
    period = rawPeriod
    qris = rawQris
    rekening = parseRekening(rawRekening)
    whatsapp = rawWhatsapp

    const publicFeatured = (rawProposals || []).filter((p) => p.status !== 'DRAFT').slice(0, 3)
    featuredProposals = await Promise.all(
      publicFeatured.map(async (p) => {
        const funding = await calculateProposalFunding(p)
        return {
          ...p,
          funding,
        } as ProposalWithFunding
      }),
    )
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
      <SectionRenderer sections={beforeFinance} articles={articles} whatsapp={whatsapp} />
      <FinanceSummary saldo={saldo} daily={daily} qris={qris} />
      <QuranMurottalSection surahs={surahs} />
      <FeaturedProposalSection proposals={featuredProposals} />
      <DonationSection qris={qris} rekening={rekening} whatsapp={whatsapp} />
      <SectionRenderer sections={afterFinance} articles={articles} whatsapp={whatsapp} />
      {!hasPengumumanSection && <LatestNews articles={articles} />}
      {testimoni && <SectionRenderer sections={[testimoni]} whatsapp={whatsapp} />}
    </>
  )
}
