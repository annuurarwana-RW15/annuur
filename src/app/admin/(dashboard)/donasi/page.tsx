import type { Metadata } from 'next'
import type { DonationStatus, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { getTableParams } from '@/lib/table-query'
import { DonationsTable, type DonationRow } from './DonationsTable'

export const metadata: Metadata = {
  title: 'Donasi — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const STATUSES = ['MENUNGGU', 'DIKONFIRMASI', 'DITOLAK'] as const

type StatusFilter = DonationStatus | 'SEMUA'

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Default MENUNGGU (antrian verifikasi); `SEMUA` menampilkan seluruh riwayat. */
function normalizeStatus(raw: string | undefined): StatusFilter {
  if (raw === 'SEMUA') return 'SEMUA'
  return (STATUSES as readonly string[]).includes(raw ?? '')
    ? (raw as DonationStatus)
    : 'MENUNGGU'
}

const CARD_STYLES = [
  {
    label: 'Menunggu',
    status: 'MENUNGGU',
    cardClass: 'border-amber-100 bg-amber-50',
    valueClass: 'text-amber-900',
  },
  {
    label: 'Dikonfirmasi',
    status: 'DIKONFIRMASI',
    cardClass: 'border-green-100 bg-green-50',
    valueClass: 'text-green-800',
  },
  {
    label: 'Ditolak',
    status: 'DITOLAK',
    cardClass: 'border-red-100 bg-red-50',
    valueClass: 'text-red-700',
  },
] as const

function SummaryCards({
  counts,
}: {
  counts: Record<DonationStatus, number>
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARD_STYLES.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 shadow-sm ${card.cardClass}`}
        >
          <p className="text-sm text-neutral-500">{card.label}</p>
          <p
            className={`mt-2 text-2xl font-semibold tabular-nums ${card.valueClass}`}
          >
            {counts[card.status]}
          </p>
        </div>
      ))}
    </div>
  )
}

export default async function DonasiAdminPage({ searchParams }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const sp = await searchParams
  const { q, page, size } = getTableParams(sp)
  const status = normalizeStatus(first(sp.status))
  const needle = q.trim()

  const clauses: Prisma.DonationWhereInput[] = []
  if (status !== 'SEMUA') clauses.push({ status })
  if (needle) {
    clauses.push({
      OR: [
        { donorName: { contains: needle, mode: 'insensitive' } },
        { reference: { contains: needle, mode: 'insensitive' } },
      ],
    })
  }
  const where: Prisma.DonationWhereInput | undefined =
    clauses.length > 0 ? { AND: clauses } : undefined

  const [grouped, total, rows] = await Promise.all([
    // Kartu = agregat seluruh waktu (bukan 30 hari) agar angka stabil.
    db.donation.groupBy({ by: ['status'], _count: { _all: true } }),
    db.donation.count({ where }),
    db.donation.findMany({
      where,
      include: { verifiedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ])

  // Donation.categoryId tanpa relasi Prisma — lookup nama per ID unik.
  const categoryIds = [
    ...new Set(
      rows
        .map((row) => row.categoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const categories = categoryIds.length
    ? await db.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : []
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  )

  const counts: Record<DonationStatus, number> = {
    MENUNGGU: 0,
    DIKONFIRMASI: 0,
    DITOLAK: 0,
  }
  for (const row of grouped) {
    if (row.status in counts) counts[row.status] = row._count._all
  }

  const donationRows: DonationRow[] = rows.map((row) => ({
    id: row.id,
    donorName: row.donorName,
    amount: Number(row.amount),
    reference: row.reference,
    status: row.status,
    message: row.message,
    proofImage: row.proofImage,
    categoryName: row.categoryId
      ? (categoryNameById.get(row.categoryId) ?? null)
      : null,
    verifiedByName: row.verifiedBy?.name ?? null,
    verifiedAt: row.verifiedAt,
    rejectNote: row.rejectNote,
    createdAt: row.createdAt,
  }))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Donasi</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Verifikasi donasi masuk — konfirmasi mencatat transaksi kas periode
            aktif, tolak butuh catatan.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SummaryCards counts={counts} />
      </div>

      <div className="mt-4">
        <DonationsTable
          rows={donationRows}
          total={total}
          page={page}
          pageSize={size}
          status={status}
        />
      </div>
    </div>
  )
}
