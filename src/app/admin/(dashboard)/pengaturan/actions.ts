'use server'

import { revalidatePath } from 'next/cache'
import { setSetting } from '@/lib/settings'
import { requireRole } from '@/lib/rbac'

export interface RekeningInput {
  bank: string
  no: string
  atasNama: string
  link?: string
}

export interface PengaturanInput {
  site: { name: string; address: string; phone: string; city: string }
  donasi: { rekening: RekeningInput[] }
  ga4: { id: string }
}

export async function setPengaturan(
  data: PengaturanInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole('ADMIN')

  try {
    await setSetting('site.name', data.site.name)
    await setSetting('site.address', data.site.address)
    await setSetting('site.phone', data.site.phone)
    await setSetting('site.city', data.site.city)
    await setSetting('donasi.rekening', data.donasi.rekening)
    await setSetting('ga4.id', data.ga4.id)
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (error) {
    console.error(error)
    return { ok: false, error: 'Gagal menyimpan pengaturan' }
  }
}
