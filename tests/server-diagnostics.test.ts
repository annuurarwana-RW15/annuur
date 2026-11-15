import { describe, expect, it, vi, beforeEach } from 'vitest'
import { formatBytes, formatUptime } from '@/lib/server-diagnostics'
import {
  DEFAULT_MAINTENANCE_CONFIG,
  getMaintenanceConfig,
  setMaintenanceConfig,
} from '@/lib/maintenance'

const mockSettingFindUnique = vi.fn()
const mockSettingUpsert = vi.fn()
const mockQueryRawUnsafe = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    setting: {
      findUnique: (...args: unknown[]) => mockSettingFindUnique(...args),
      upsert: (...args: unknown[]) => mockSettingUpsert(...args),
    },
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
  },
}))

describe('formatBytes helper', () => {
  it('memformat ukuran byte dengan benar', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB')
    expect(formatBytes(1024 * 1024 * 1024 * 1.2)).toBe('1.20 GB')
  })
})

describe('formatUptime helper', () => {
  it('memformat detik uptime ke hari, jam, menit, detik', () => {
    expect(formatUptime(45)).toBe('45 detik')
    expect(formatUptime(125)).toBe('2 menit 5 detik')
    expect(formatUptime(3665)).toBe('1 jam 1 menit 5 detik')
    expect(formatUptime(90065)).toBe('1 hari 1 jam 1 menit 5 detik')
  })
})

describe('maintenance helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan default maintenance config jika belum ada di db', async () => {
    mockSettingFindUnique.mockResolvedValue(null)
    const config = await getMaintenanceConfig()
    expect(config).toEqual(DEFAULT_MAINTENANCE_CONFIG)
  })

  it('mengembalikan config tersimpan dari db', async () => {
    mockSettingFindUnique.mockResolvedValue({
      key: 'system.maintenance',
      value: {
        enabled: true,
        title: 'Upgrade Server',
        message: 'Sedang ada peningkatan kapasitas',
        estimatedEnd: '2026-11-16T12:00:00Z',
      },
    })
    const config = await getMaintenanceConfig()
    expect(config.enabled).toBe(true)
    expect(config.title).toBe('Upgrade Server')
    expect(config.message).toBe('Sedang ada peningkatan kapasitas')
    expect(config.estimatedEnd).toBe('2026-11-16T12:00:00Z')
  })

  it('dapat menyimpan config maintenance yang valid', async () => {
    mockSettingFindUnique.mockResolvedValue(null)
    mockSettingUpsert.mockResolvedValue({ key: 'system.maintenance', value: {} })

    const res = await setMaintenanceConfig({
      enabled: true,
      title: 'Pemeliharaan Baru',
      message: 'Pesan pemeliharaan baru',
      estimatedEnd: null,
    })

    expect(res.ok).toBe(true)
    expect(mockSettingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'system.maintenance' },
        create: expect.objectContaining({
          value: expect.objectContaining({
            enabled: true,
            title: 'Pemeliharaan Baru',
          }),
        }),
      }),
    )
  })

  it('menolak simpan jika judul atau pesan kosong', async () => {
    mockSettingFindUnique.mockResolvedValue(null)
    const resTitle = await setMaintenanceConfig({ title: '   ' })
    expect(resTitle.ok).toBe(false)
    expect(resTitle.error).toMatch(/judul/i)

    const resMsg = await setMaintenanceConfig({ message: '   ' })
    expect(resMsg.ok).toBe(false)
    expect(resMsg.error).toMatch(/pesan/i)
  })
})
