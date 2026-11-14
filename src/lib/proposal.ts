import { db } from '@/lib/db'
import { slugify } from '@/lib/slugify'
import type { ProposalStatus, Prisma } from '@prisma/client'

export interface ProposalFilter {
  status?: ProposalStatus | 'ALL'
  featuredOnly?: boolean
  search?: string
}

export interface ProposalFunding {
  targetAmount: number
  collectedManual: number
  onlineDonationsTotal: number
  collectedTotal: number
  percentage: number
  remaining: number
  isFulfilled: boolean
  onlineDonationsCount: number
}

export async function getAllProposals(filter?: ProposalFilter) {
  const where: Prisma.ProposalWhereInput = {}

  if (filter?.status && filter.status !== 'ALL') {
    where.status = filter.status
  }
  if (filter?.featuredOnly) {
    where.isFeatured = true
  }
  if (filter?.search?.trim()) {
    const term = filter.search.trim()
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { picName: { contains: term, mode: 'insensitive' } },
    ]
  }

  return db.proposal.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      program: {
        select: { id: true, title: true, slug: true },
      },
    },
  })
}

export async function getProposalBySlug(slug: string) {
  return db.proposal.findUnique({
    where: { slug },
    include: {
      category: true,
      program: true,
    },
  })
}

export async function getProposalById(id: string) {
  return db.proposal.findUnique({
    where: { id },
    include: {
      category: true,
      program: true,
    },
  })
}

export async function uniqueProposalSlug(base: string, excludeId?: string): Promise<string> {
  const normalized = slugify(base)
  if (!normalized) return 'proposal'

  let candidate = normalized
  let counter = 2
  for (;;) {
    const clash = await db.proposal.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${normalized}-${counter}`
    counter += 1
  }
}

export async function calculateProposalFunding(proposal: {
  id?: string
  targetAmount: number | Prisma.Decimal
  collectedManual: number | Prisma.Decimal
  categoryId?: string | null
}): Promise<ProposalFunding> {
  const target = Number(proposal.targetAmount) || 0
  const manual = Number(proposal.collectedManual) || 0

  let onlineTotal = 0
  let onlineCount = 0

  if (proposal.categoryId) {
    const [agg, count] = await Promise.all([
      db.donation.aggregate({
        where: {
          categoryId: proposal.categoryId,
          status: 'DIKONFIRMASI',
        },
        _sum: {
          amount: true,
        },
      }),
      db.donation.count({
        where: {
          categoryId: proposal.categoryId,
          status: 'DIKONFIRMASI',
        },
      }),
    ])

    onlineTotal = Number(agg._sum.amount ?? 0)
    onlineCount = count
  }

  const collectedTotal = manual + onlineTotal
  const percentage =
    target > 0 ? Math.min(100, Math.round((collectedTotal / target) * 100)) : 0
  const remaining = Math.max(0, target - collectedTotal)
  const isFulfilled = target > 0 && collectedTotal >= target

  return {
    targetAmount: target,
    collectedManual: manual,
    onlineDonationsTotal: onlineTotal,
    collectedTotal,
    percentage,
    remaining,
    isFulfilled,
    onlineDonationsCount: onlineCount,
  }
}

export function serializeProposal(
  p: {
    id: string
    title: string
    slug: string
    summary: string
    description: string
    coverImage?: string | null
    filePdf?: string | null
    filePdfSize?: string | null
    targetAmount: Prisma.Decimal | number
    collectedManual: Prisma.Decimal | number
    categoryId?: string | null
    category?: { id: string; name: string; color?: string | null } | null
    programId?: string | null
    program?: { id: string; title: string; slug: string } | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    status: ProposalStatus
    isFeatured: boolean
    picName?: string | null
    picPhone?: string | null
    createdAt: Date | string
    updatedAt: Date | string
  },
  funding: ProposalFunding,
) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    description: p.description,
    coverImage: p.coverImage ?? null,
    filePdf: p.filePdf ?? null,
    filePdfSize: p.filePdfSize ?? null,
    targetAmount: Number(p.targetAmount || 0),
    collectedManual: Number(p.collectedManual || 0),
    categoryId: p.categoryId ?? null,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          color: p.category.color ?? null,
        }
      : null,
    programId: p.programId ?? null,
    program: p.program
      ? {
          id: p.program.id,
          title: p.program.title,
          slug: p.program.slug,
        }
      : null,
    startDate: p.startDate
      ? p.startDate instanceof Date
        ? p.startDate.toISOString()
        : String(p.startDate)
      : null,
    endDate: p.endDate
      ? p.endDate instanceof Date
        ? p.endDate.toISOString()
        : String(p.endDate)
      : null,
    status: p.status,
    isFeatured: Boolean(p.isFeatured),
    picName: p.picName ?? null,
    picPhone: p.picPhone ?? null,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    funding,
  }
}

