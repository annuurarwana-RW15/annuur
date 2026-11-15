import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { getKegiatanRutinList } from '@/lib/kegiatan-rutin-server'
import { KegiatanRutinClient } from './KegiatanRutinClient'

export const metadata: Metadata = {
  title: 'Kegiatan Rutin — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function KegiatanRutinPage() {
  await requireRole('ADMIN')

  const list = await getKegiatanRutinList()

  return (
    <div className="mx-auto max-w-7xl">
      <KegiatanRutinClient initialList={list} />
    </div>
  )
}

