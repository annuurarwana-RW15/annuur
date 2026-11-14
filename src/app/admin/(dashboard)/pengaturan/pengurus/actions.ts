'use server'

import { requireRole } from '@/lib/rbac'
import {
  savePengurusList,
} from '@/lib/pengurus-server'
import {
  DEFAULT_PENGURUS_LIST,
  type PengurusItem,
} from '@/lib/pengurus'
import {
  generateJumatSchedule,
  type GenerateKhotibOptions,
} from '@/lib/khotib-generator'
import {
  applyJumatScheduleToFrontend,
} from '@/lib/khotib-server'
import type { JumatRow } from '@/app/admin/(dashboard)/sections/jumat-items'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

export async function savePengurusAction(
  items: PengurusItem[],
): Promise<ActionResult<PengurusItem[]>> {
  try {
    await requireRole('ADMIN')
    await savePengurusList(items)
    return { ok: true, data: items }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan data pengurus',
    }
  }
}

export async function resetPengurusAction(): Promise<ActionResult<PengurusItem[]>> {
  try {
    await requireRole('ADMIN')
    await savePengurusList(DEFAULT_PENGURUS_LIST)
    return { ok: true, data: DEFAULT_PENGURUS_LIST }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal mereset data pengurus',
    }
  }
}

export async function generateAndApplyKhotibAction(
  options: GenerateKhotibOptions,
): Promise<ActionResult<JumatRow[]>> {
  try {
    await requireRole('ADMIN')
    const schedule = generateJumatSchedule(options)
    await applyJumatScheduleToFrontend(schedule)
    return { ok: true, data: schedule }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal membuat jadwal khotib',
    }
  }
}

export async function saveManualKhotibScheduleAction(
  schedule: JumatRow[],
): Promise<ActionResult<JumatRow[]>> {
  try {
    await requireRole('ADMIN')
    await applyJumatScheduleToFrontend(schedule)
    return { ok: true, data: schedule }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan jadwal khotib',
    }
  }
}
