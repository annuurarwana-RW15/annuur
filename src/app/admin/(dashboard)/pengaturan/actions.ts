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

export interface QrisInput {
  image: string
  caption: string
}

export interface PengaturanInput {
  site: {
    name: string
    address: string
    phone: string
    city: string
    favicon?: string
  }
  seo: {
    title: string
    description: string
    keywords?: string
    ogImage?: string
    author?: string
    robots?: string
  }
  webmaster?: {
    google?: string
    bing?: string
    yandex?: string
  }
  donasi: { rekening: RekeningInput[]; qris: QrisInput }
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
    await setSetting('site.favicon', data.site.favicon ?? '')
    await setSetting('seo.title', data.seo.title)
    await setSetting('seo.description', data.seo.description)
    await setSetting('seo.keywords', data.seo.keywords ?? '')
    await setSetting('seo.ogImage', data.seo.ogImage ?? '')
    await setSetting('seo.author', data.seo.author ?? '')
    await setSetting('seo.robots', data.seo.robots ?? 'index')
    await setSetting('webmaster.google', data.webmaster?.google ?? '')
    await setSetting('webmaster.bing', data.webmaster?.bing ?? '')
    await setSetting('webmaster.yandex', data.webmaster?.yandex ?? '')
    await setSetting('donasi.rekening', data.donasi.rekening)
    await setSetting('donasi.qris', data.donasi.qris)
    await setSetting('ga4.id', data.ga4.id)

    // Metadata root dibaca dari Setting -> seluruh tree harus disegarkan.
    revalidatePath('/', 'layout')
    revalidatePath('/sitemap.xml')
    revalidatePath('/robots.txt')
    return { ok: true }
  } catch (error) {
    console.error(error)
    return { ok: false, error: 'Gagal menyimpan pengaturan' }
  }
}
