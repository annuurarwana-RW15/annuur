import { getSetting, setSetting } from '@/lib/settings'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_PENGURUS_LIST,
  normalizePengurusList,
  type PengurusItem,
} from './pengurus'

export async function getPengurusList(): Promise<PengurusItem[]> {
  try {
    const raw = await getSetting<unknown>('site.pengurus', null)
    if (!raw) {
      return DEFAULT_PENGURUS_LIST
    }
    const parsed = normalizePengurusList(raw)
    return parsed.length > 0 ? parsed : DEFAULT_PENGURUS_LIST
  } catch {
    return DEFAULT_PENGURUS_LIST
  }
}

export async function savePengurusList(list: PengurusItem[]): Promise<void> {
  const normalized = normalizePengurusList(list)
  await setSetting('site.pengurus', normalized)
  try {
    revalidatePath('/profil')
    revalidatePath('/')
    revalidatePath('/admin/pengaturan/pengurus')
  } catch {
    // Ignore cache error in non-request contexts
  }
}
