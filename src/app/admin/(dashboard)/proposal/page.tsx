import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { db } from '@/lib/db'
import { getAllProposals, calculateProposalFunding } from '@/lib/proposal'
import {
  ProposalAdminClient,
  type AdminProposalItem,
  type AdminCategoryOption,
  type AdminProgramOption,
} from './ProposalAdminClient'

export const metadata: Metadata = {
  title: 'Kelola Proposal Terbuka — Admin',
}

export default async function AdminProposalPage() {
  await requireRole('ADMIN', 'KONTEN')

  const [proposals, categories, programs] = await Promise.all([
    getAllProposals(),
    db.category.findMany({
      where: { type: 'MASUK', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.program.findMany({
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const serializedProposals: AdminProposalItem[] = await Promise.all(
    proposals.map(async (p) => {
      const funding = await calculateProposalFunding(p)
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        coverImage: p.coverImage,
        filePdf: p.filePdf,
        filePdfSize: p.filePdfSize,
        targetAmount: Number(p.targetAmount),
        collectedManual: Number(p.collectedManual),
        categoryId: p.categoryId,
        category: p.category,
        programId: p.programId,
        program: p.program,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        status: p.status,
        isFeatured: p.isFeatured,
        picName: p.picName,
        picPhone: p.picPhone,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        funding,
      }
    }),
  )

  return (
    <ProposalAdminClient
      initialProposals={serializedProposals}
      categories={categories as AdminCategoryOption[]}
      programs={programs as AdminProgramOption[]}
    />
  )
}

