'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { setSetting } from '@/lib/settings'

export interface KontakInput {
  alamat: string
  telp: string
  whatsapp: string
  email: string
  jam: string
  mapUrl: string
  mapQuery: string
}

export interface KontakResult {
  ok: boolean
  error?: string
}

export async function setKontakSettings(input: KontakInput): Promise<KontakResult> {
  await requireRole('ADMIN')

  try {
    const alamat = input.alamat.trim()
    const telp = input.telp.trim()
    const whatsapp = input.whatsapp.trim()
    const email = input.email.trim()
    const jam = input.jam.trim()
    const mapUrl = input.mapUrl.trim()
    const mapQuery = input.mapQuery.trim()

    // 1. Simpan atau perbarui section kontak di tabel Section
    const existing = await db.section.findUnique({ where: { key: 'kontak' } })
    const existingContent =
      existing && typeof existing.content === 'object' && existing.content !== null && !Array.isArray(existing.content)
        ? (existing.content as Record<string, unknown>)
        : {}

    const updatedContent = {
      ...existingContent,
      alamat,
      address: alamat,
      telp,
      phone: telp,
      whatsapp,
      wa: whatsapp,
      email,
      jam,
      hours: jam,
      mapUrl,
      mapLink: mapUrl,
      mapQuery,
      mapEmbed: mapQuery,
    }

    if (existing) {
      await db.section.update({
        where: { id: existing.id },
        data: {
          title: existing.title || 'Kontak & Lokasi',
          content: updatedContent,
          isVisible: true,
        },
      })
    } else {
      await db.section.create({
        data: {
          key: 'kontak',
          title: 'Kontak & Lokasi',
          order: 7,
          isVisible: true,
          content: updatedContent,
        },
      })
    }

    // 2. Sinkronkan ke pengaturan global (Setting) untuk konsistensi fallback
    if (alamat) {
      await setSetting('site.address', alamat)
    }
    if (telp) {
      await setSetting('site.phone', telp)
    }

    // 3. Revalidasi halaman publik dan admin
    revalidatePath('/')
    revalidatePath('/kontak')
    revalidatePath('/admin/pengaturan')
    revalidatePath('/admin/pengaturan/kontak')
    revalidatePath('/admin/sections')

    return { ok: true }
  } catch (error) {
    console.error('[setKontakSettings] Gagal menyimpan kontak:', error)
    return { ok: false, error: 'Terjadi kesalahan saat menyimpan data kontak' }
  }
}

