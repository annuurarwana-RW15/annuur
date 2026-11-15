'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/rbac'
import {
  type MaintenanceConfig,
  setMaintenanceConfig,
} from '@/lib/maintenance'
import {
  getServerDiagnostics,
  type ServerDiagnosticsData,
} from '@/lib/server-diagnostics'
import {
  validateBackupPayload,
  executeDatabaseRestore,
  type ValidationResult,
} from '@/lib/database-restore'

export async function updateMaintenanceAction(
  input: Partial<MaintenanceConfig>,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole('ADMIN')
  const res = await setMaintenanceConfig(input)
  if (res.ok) {
    revalidatePath('/')
    revalidatePath('/admin/pengaturan/server')
  }
  return res
}

export async function fetchFreshDiagnosticsAction(): Promise<ServerDiagnosticsData> {
  await requireRole('ADMIN')
  return getServerDiagnostics()
}

export async function validateBackupFileAction(
  rawJson: string,
): Promise<ValidationResult> {
  await requireRole('ADMIN')
  return validateBackupPayload(rawJson)
}

export async function restoreDatabaseAction(
  rawJson: string,
  confirmPhrase: string,
): Promise<{ ok: boolean; error?: string; restoredCounts?: Record<string, number> }> {
  await requireRole('ADMIN')

  if (confirmPhrase.trim().toUpperCase() !== 'PULIHKAN') {
    return { ok: false, error: 'Kata kunci konfirmasi tidak sesuai. Ketik PULIHKAN untuk melanjutkan.' }
  }

  const validation = validateBackupPayload(rawJson)
  if (!validation.valid || !validation.payload) {
    return { ok: false, error: validation.error || 'Berkas cadangan tidak valid' }
  }

  const result = await executeDatabaseRestore(validation.payload)
  if (result.ok) {
    revalidatePath('/', 'layout')
    revalidatePath('/admin', 'layout')
  }
  return result
}
