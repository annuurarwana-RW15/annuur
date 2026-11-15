import type { Metadata } from 'next'
import { requireRole } from '@/lib/rbac'
import { getServerDiagnostics } from '@/lib/server-diagnostics'
import { getMaintenanceConfig } from '@/lib/maintenance'
import { ServerManagerClient } from './ServerManagerClient'

export const metadata: Metadata = {
  title: 'Server & Database — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default async function ServerPage() {
  await requireRole('ADMIN')

  const [diagnostics, maintenance] = await Promise.all([
    getServerDiagnostics(),
    getMaintenanceConfig(),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <ServerManagerClient
        initialDiagnostics={diagnostics}
        initialMaintenance={maintenance}
      />
    </div>
  )
}
