import { getSetting, setSetting } from './settings'

export const MAINTENANCE_SETTING_KEY = 'system.maintenance'

export interface MaintenanceConfig {
  enabled: boolean
  title: string
  message: string
  estimatedEnd?: string | null
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: false,
  title: 'Situs Sedang Dalam Pemeliharaan Berkala',
  message:
    'Assalamu’alaikum Warahmatullahi Wabarakatuh. Saat ini sistem informasi Masjid An-nuur Arwana sedang dalam pemeliharaan berkala untuk peningkatan layanan jamaah. Insya Allah segera kembali normal.',
  estimatedEnd: null,
}

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const data = await getSetting<Partial<MaintenanceConfig>>(
    MAINTENANCE_SETTING_KEY,
    DEFAULT_MAINTENANCE_CONFIG,
  )

  return {
    enabled: Boolean(data.enabled),
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_MAINTENANCE_CONFIG.title,
    message: typeof data.message === 'string' && data.message.trim() ? data.message.trim() : DEFAULT_MAINTENANCE_CONFIG.message,
    estimatedEnd: typeof data.estimatedEnd === 'string' ? data.estimatedEnd.trim() : null,
  }
}

export async function setMaintenanceConfig(
  input: Partial<MaintenanceConfig>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const current = await getMaintenanceConfig()
    const updated: MaintenanceConfig = {
      enabled: input.enabled !== undefined ? Boolean(input.enabled) : current.enabled,
      title: input.title !== undefined ? String(input.title).trim() : current.title,
      message: input.message !== undefined ? String(input.message).trim() : current.message,
      estimatedEnd: input.estimatedEnd !== undefined ? (input.estimatedEnd ? String(input.estimatedEnd).trim() : null) : current.estimatedEnd,
    }

    if (!updated.title) {
      return { ok: false, error: 'Judul pemeliharaan wajib diisi' }
    }
    if (!updated.message) {
      return { ok: false, error: 'Pesan pemeliharaan wajib diisi' }
    }

    await setSetting(MAINTENANCE_SETTING_KEY, updated)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pemeliharaan',
    }
  }
}
