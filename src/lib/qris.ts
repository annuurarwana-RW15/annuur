import { getSetting } from '@/lib/settings'

export interface QrisInfo {
  image: string
  caption: string
}

export const DEFAULT_QRIS: QrisInfo = {
  image: '/images/qris-dkm.jpg',
  caption: 'NMID: ID1026628438099 - DKM Masjid An-Nur Arwana',
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

/** Pengaturan QRIS donasi untuk section Laporan Keuangan beranda dan halaman donasi. */
export async function getQris(): Promise<QrisInfo | null> {
  const raw = await getSetting<unknown>('donasi.qris', null)
  if (raw === null || raw === undefined) {
    return DEFAULT_QRIS
  }
  return parseQris(raw)
}
