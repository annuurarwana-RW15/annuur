import { db } from '@/lib/db'
import { slugify } from '@/lib/slugify'
import type {
  ProgramPeriodType,
  ProgramCategory,
  ProgramStatus,
  Prisma,
} from '@prisma/client'

export interface ProgramFilter {
  periodType?: ProgramPeriodType | 'ALL'
  status?: ProgramStatus | 'ALL'
  category?: ProgramCategory | 'ALL'
  search?: string
  featuredOnly?: boolean
  take?: number
}

export async function getAllPrograms(filter?: ProgramFilter) {
  const where: Prisma.ProgramWhereInput = {}

  if (filter?.periodType && filter.periodType !== 'ALL') {
    where.periodType = filter.periodType
  }
  if (filter?.status && filter.status !== 'ALL') {
    where.status = filter.status
  }
  if (filter?.category && filter.category !== 'ALL') {
    where.category = filter.category
  }
  if (filter?.featuredOnly) {
    where.isFeatured = true
  }
  if (filter?.search?.trim()) {
    const term = filter.search.trim()
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { picName: { contains: term, mode: 'insensitive' } },
    ]
  }

  return db.program.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: filter?.take,
    include: {
      proposals: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          targetAmount: true,
        },
      },
    },
  })
}

export async function getProgramBySlug(slug: string) {
  return db.program.findUnique({
    where: { slug },
    include: {
      proposals: true,
    },
  })
}

export async function getProgramById(id: string) {
  return db.program.findUnique({
    where: { id },
    include: {
      proposals: true,
    },
  })
}

export async function uniqueProgramSlug(base: string, excludeId?: string): Promise<string> {
  const normalized = slugify(base)
  if (!normalized) return 'program'

  let candidate = normalized
  let counter = 2
  for (;;) {
    const clash = await db.program.findFirst({
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

export async function updateProgramProgress(id: string, progress: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))
  return db.program.update({
    where: { id },
    data: { progress: clamped },
  })
}

export function serializeProgram(p: {
  id: string
  title: string
  slug: string
  description: string
  periodType: ProgramPeriodType
  category: ProgramCategory
  status: ProgramStatus
  progress: number
  targetDate: Date | string | null
  budgetEstimate: Prisma.Decimal | number | null
  picName: string | null
  picPhone: string | null
  order: number
  isFeatured: boolean
  createdAt: Date | string
  updatedAt: Date | string
  proposals?: Array<{
    id: string
    title: string
    slug: string
    status?: string
    targetAmount?: Prisma.Decimal | number
  }>
}) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    periodType: p.periodType,
    category: p.category,
    status: p.status,
    progress: p.progress,
    targetDate: p.targetDate
      ? p.targetDate instanceof Date
        ? p.targetDate.toISOString()
        : String(p.targetDate)
      : null,
    budgetEstimate: p.budgetEstimate != null ? Number(p.budgetEstimate) : null,
    picName: p.picName ?? null,
    picPhone: p.picPhone ?? null,
    order: p.order,
    isFeatured: Boolean(p.isFeatured),
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    proposals: (p.proposals || []).map((prop) => ({
      id: prop.id,
      title: prop.title,
      slug: prop.slug,
      status: prop.status || 'DIBUKA',
      targetAmount: Number(prop.targetAmount || 0),
    })),
  }
}

