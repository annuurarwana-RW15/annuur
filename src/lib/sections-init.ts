import { db } from './db'

let cachedResult: DefaultSectionsResult | null = null

export function resetSectionsCache(): void {
  cachedResult = null
}

export interface DefaultSectionsResult {
  footerId?: string
  tiktokId?: string
  kontakId?: string
}

/**
 * Memastikan section bawaan sistem (`footer`, `tiktok`, dan `kontak`) tersedia di database.
 * Bersifat idempoten dan aman dieksekusi berulang kali.
 */
export async function ensureDefaultSections(): Promise<DefaultSectionsResult> {
  if (cachedResult) return cachedResult

  try {
    let [footer, tiktok, kontak] = await Promise.all([
      db.section.findUnique({ where: { key: 'footer' } }),
      db.section.findUnique({ where: { key: 'tiktok' } }),
      db.section.findUnique({ where: { key: 'kontak' } }),
    ])

    if (!footer) {
      footer = await db.section.create({
        data: {
          key: 'footer',
          title: 'Footer',
          order: 8,
          isVisible: true,
          content: {
            text: '© 2026 Masjid An-nuur Arwana. Semua hak dilindungi.',
            socialLinks: [],
          },
        },
      })
    }

    if (!tiktok) {
      tiktok = await db.section.create({
        data: {
          key: 'tiktok',
          title: 'Feed TikTok Official',
          order: 6,
          isVisible: true,
          content: {
            username: '@masjidannuurarwana',
            accountUrl: 'https://www.tiktok.com/@masjidannuurarwana',
            title: 'Kajian singkat, dokumentasi ibadah, dan kegiatan sosial Masjid An-nuur Arwana.',
            videoId: '',
          },
        },
      })
    }

    if (!kontak) {
      kontak = await db.section.create({
        data: {
          key: 'kontak',
          title: 'Kontak & Lokasi',
          order: 7,
          isVisible: true,
          content: {
            address: 'Perum Arwana Blok B, Karawang',
            phone: '0812-3456-7890',
            email: 'dkm@annuur-arwana.id',
            hours: 'Setiap Hari (04.00 - 21.00 WIB)',
            mapEmbed: '',
            mapUrl: '',
          },
        },
      })
    }

    cachedResult = {
      footerId: footer.id,
      tiktokId: tiktok.id,
      kontakId: kontak.id,
    }
    return cachedResult
  } catch (error) {
    console.error('[sections-init] Gagal memastikan default sections:', error)
    return {}
  }
}

