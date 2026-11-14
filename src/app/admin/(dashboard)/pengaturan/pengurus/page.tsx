import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { db } from '@/lib/db'
import { getPengurusList } from '@/lib/pengurus-server'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { parseJumatItems } from '@/app/admin/(dashboard)/sections/jumat-items'
import { PengurusManagerClient } from './PengurusManagerClient'

export const metadata: Metadata = {
  title: 'Pengurus & Khotib — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function PengurusPengaturanPage() {
  await requireRole('ADMIN')

  const [pengurusList, jumatSection] = await Promise.all([
    getPengurusList(),
    db.section.findUnique({
      where: { key: 'jumat' },
      select: { content: true },
    }),
  ])

  const rawJumatItems = readField(jumatSection?.content, 'jumat', 'items')
  const jadwalJumat = parseJumatItems(
    Array.isArray(rawJumatItems) ? JSON.stringify(rawJumatItems) : '[]',
  )

  return (
    <div className="mx-auto max-w-7xl">
      <PengurusManagerClient
        initialPengurus={pengurusList}
        initialJadwalJumat={jadwalJumat}
      />
    </div>
  )
}
