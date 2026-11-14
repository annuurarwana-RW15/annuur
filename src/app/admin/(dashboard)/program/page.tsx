import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { getAllPrograms } from '@/lib/program'
import { ProgramAdminClient, type AdminProgramItem } from './ProgramAdminClient'

export const metadata: Metadata = {
  title: 'Kelola Program Kerja — Admin',
}

export default async function AdminProgramPage() {
  await requireRole('ADMIN', 'KONTEN')

  const programs = await getAllPrograms()

  const serializedPrograms: AdminProgramItem[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    periodType: p.periodType,
    category: p.category,
    status: p.status,
    progress: p.progress,
    targetDate: p.targetDate ? p.targetDate.toISOString() : null,
    budgetEstimate: p.budgetEstimate ? Number(p.budgetEstimate) : null,
    picName: p.picName,
    picPhone: p.picPhone,
    order: p.order,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    proposals: p.proposals,
  }))

  return <ProgramAdminClient initialPrograms={serializedPrograms} />
}

