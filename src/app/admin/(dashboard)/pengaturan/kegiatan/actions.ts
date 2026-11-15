'use server'

import { requireRole } from '@/lib/rbac'
import {
  saveKegiatanRutinList,
} from '@/lib/kegiatan-rutin-server'
import {
  DEFAULT_KEGIATAN_RUTIN,
  type KegiatanRutinItem,
} from '@/lib/kegiatan-rutin'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

export async function saveKegiatanRutinAction(
  items: KegiatanRutinItem[],
): Promise<ActionResult<KegiatanRutinItem[]>> {
  try {
    await requireRole('ADMIN')
    await saveKegiatanRutinList(items)
    return { ok: true, data: items }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan data kegiatan rutin',
    }
  }
}

export async function resetKegiatanRutinAction(): Promise<ActionResult<KegiatanRutinItem[]>> {
  try {
    await requireRole('ADMIN')
    await saveKegiatanRutinList(DEFAULT_KEGIATAN_RUTIN)
    return { ok: true, data: DEFAULT_KEGIATAN_RUTIN }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal mereset kegiatan rutin',
    }
  }
}
