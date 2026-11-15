import { getSetting, setSetting } from '@/lib/settings'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_KEGIATAN_RUTIN,
  normalizeKegiatanRutinList,
  type KegiatanRutinItem,
} from './kegiatan-rutin'

export async function getKegiatanRutinList(): Promise<KegiatanRutinItem[]> {
  try {
    const raw = await getSetting<unknown>('kegiatan.rutin', null)
    if (!raw) {
      return DEFAULT_KEGIATAN_RUTIN
    }
    const parsed = normalizeKegiatanRutinList(raw)
    return parsed.length > 0 ? parsed : DEFAULT_KEGIATAN_RUTIN
  } catch {
    return DEFAULT_KEGIATAN_RUTIN
  }
}

export async function saveKegiatanRutinList(list: KegiatanRutinItem[]): Promise<void> {
  const normalized = normalizeKegiatanRutinList(list)
  await setSetting('kegiatan.rutin', normalized)
  try {
    revalidatePath('/')
    revalidatePath('/kegiatan')
    revalidatePath('/admin/pengaturan/kegiatan')
  } catch {
    // Ignore cache error in non-request contexts
  }
}
