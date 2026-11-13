/**
 * Helper client-safe untuk normalisasi dan pembuatan URL WhatsApp langsung (https://wa.me/...)
 * Mendukung format nomor: 08xx, +628xx, 628xx.
 */
export function formatWhatsAppLink(
  phone: string,
  text = "Assalamu'alaikum Pengurus DKM Masjid An-nuur Arwana",
): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  const normalized = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}
