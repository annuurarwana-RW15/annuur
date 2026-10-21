import { getSetting } from '@/lib/settings'

export interface QrisInfo {
  image: string
  caption: string
}

/**
 * Menormalkan nilai mentah `donasi.qris` dari DB.
 * Null bila belum diisi atau gambar kosong — kartu QRIS disembunyikan.
 */
export function parseQris(value: unknown): QrisInfo | null {
  if (!value || typeof value !== 'object') return null
  const rec = value as Record<string, unknown>
  const image = typeof rec.image === 'string' ? rec.image.trim() : ''
  if (!image) return null
  const caption = typeof rec.caption === 'string' ? rec.caption.trim() : ''
  return { image, caption }
}

/** Pengaturan QRIS donasi untuk section Laporan Keuangan beranda. */
export async function getQris(): Promise<QrisInfo | null> {
  const raw = await getSetting<unknown>('donasi.qris', null)
  return parseQris(raw)
}
