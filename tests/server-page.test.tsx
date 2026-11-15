import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  updateMaintenanceAction,
  fetchFreshDiagnosticsAction,
  validateBackupFileAction,
  restoreDatabaseAction,
} from '@/app/admin/(dashboard)/pengaturan/server/actions'

const mockRequireRole = vi.fn()
const mockSetMaintenanceConfig = vi.fn()
const mockGetServerDiagnostics = vi.fn()
const mockExecuteDatabaseRestore = vi.fn()

vi.mock('@/lib/rbac', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

vi.mock('@/lib/maintenance', () => ({
  setMaintenanceConfig: (...args: unknown[]) => mockSetMaintenanceConfig(...args),
}))

vi.mock('@/lib/server-diagnostics', () => ({
  getServerDiagnostics: (...args: unknown[]) => mockGetServerDiagnostics(...args),
}))

vi.mock('@/lib/database-restore', () => ({
  validateBackupPayload: (raw: string) => {
    if (raw.includes('INVALID')) return { valid: false, error: 'Berkas tidak valid' }
    return {
      valid: true,
      summary: { user: 1 },
      payload: { version: 1, exportedAt: '', site: '', summary: {}, tables: { user: [] } },
    }
  },
  executeDatabaseRestore: (...args: unknown[]) => mockExecuteDatabaseRestore(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Server & Database Admin Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireRole.mockResolvedValue({ id: 'adm-1', role: 'ADMIN' })
  })

  it('updateMaintenanceAction memeriksa role ADMIN dan memanggil setMaintenanceConfig', async () => {
    mockSetMaintenanceConfig.mockResolvedValue({ ok: true })
    const res = await updateMaintenanceAction({ enabled: true, title: 'Maintenance' })
    expect(mockRequireRole).toHaveBeenCalledWith('ADMIN')
    expect(mockSetMaintenanceConfig).toHaveBeenCalledWith({ enabled: true, title: 'Maintenance' })
    expect(res.ok).toBe(true)
  })

  it('fetchFreshDiagnosticsAction memeriksa role ADMIN dan mengembalikan data diagnostik', async () => {
    mockGetServerDiagnostics.mockResolvedValue({
      database: { status: 'connected', latencyMs: 5 },
      storage: { totalBytes: 1024, totalFiles: 5, formattedSize: '1.00 KB' },
      runtime: { nodeVersion: 'v20', env: 'test', uptimeSeconds: 100, uptimeFormatted: '1 menit', memory: { heapUsedMb: 50, heapTotalMb: 100, rssMb: 150 } },
    })

    const res = await fetchFreshDiagnosticsAction()
    expect(mockRequireRole).toHaveBeenCalledWith('ADMIN')
    expect(res.database.status).toBe('connected')
    expect(res.database.latencyMs).toBe(5)
  })

  it('validateBackupFileAction memvalidasi payload json', async () => {
    const resValid = await validateBackupFileAction('{"valid": true}')
    expect(resValid.valid).toBe(true)

    const resInvalid = await validateBackupFileAction('INVALID')
    expect(resInvalid.valid).toBe(false)
  })

  it('restoreDatabaseAction menolak pemulihan jika kata kunci konfirmasi salah', async () => {
    const res = await restoreDatabaseAction('{"valid": true}', 'SALAH')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/kata kunci konfirmasi tidak sesuai/i)
    expect(mockExecuteDatabaseRestore).not.toHaveBeenCalled()
  })

  it('restoreDatabaseAction mengeksekusi pemulihan saat kata kunci konfirmasi adalah PULIHKAN', async () => {
    mockExecuteDatabaseRestore.mockResolvedValue({ ok: true, restoredCounts: { user: 1 } })
    const res = await restoreDatabaseAction('{"valid": true}', 'PULIHKAN')
    expect(mockRequireRole).toHaveBeenCalledWith('ADMIN')
    expect(mockExecuteDatabaseRestore).toHaveBeenCalled()
    expect(res.ok).toBe(true)
  })
})
