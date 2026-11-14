import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'

/**
 * Mengambil nomor WhatsApp yang dikonfigurasi di dashboard admin:
 * 1. Dari section 'kontak' di tabel Section (content.whatsapp / content.wa)
 * 2. Dari fallback nomor telepon section 'kontak' (content.telp / content.phone)
 * 3. Dari Setting global 'site.whatsapp' atau 'site.phone'
 */
export async function getWhatsAppNumber(): Promise<string> {
  try {
    const [section, settingWa, settingPhone] = await Promise.all([
      db.section.findUnique({ where: { key: 'kontak' } }),
      getSetting<string>('site.whatsapp', ''),
      getSetting<string>('site.phone', ''),
    ])

    const content = section?.content
    const fromSection =
      (typeof readField(content, 'kontak', 'whatsapp') === 'string'
        ? (readField(content, 'kontak', 'whatsapp') as string)
        : '') ||
      (typeof readField(content, 'kontak', 'wa') === 'string'
        ? (readField(content, 'kontak', 'wa') as string)
        : '') ||
      (typeof readField(content, 'kontak', 'telp') === 'string'
        ? (readField(content, 'kontak', 'telp') as string)
        : '')

    const candidate = fromSection || settingWa || settingPhone || ''
    return candidate.trim()
  } catch (error) {
    console.error('[getWhatsAppNumber] Gagal memuat nomor WhatsApp:', error)
    return ''
  }
}

