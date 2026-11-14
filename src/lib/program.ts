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

