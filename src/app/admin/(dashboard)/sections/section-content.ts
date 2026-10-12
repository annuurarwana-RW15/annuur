/**
 * Bentuk konten section: kunci kanonik = kunci bentuk-editor (lihat brief Task 8),
 * dengan alias ke kunci legacy seed (prisma/seed.ts) supaya data lama tetap terbaca
 * dan renderer publik (Task 9) tidak kehilangan isi saat admin menyimpan.
 */
const ALIASES: Record<string, Record<string, string>> = {
  hero: { subjudul: 'subheading', imageUrl: 'image' },
  profil: { text: 'body' },
  kontak: { alamat: 'address', telp: 'phone', jam: 'hours', mapQuery: 'mapEmbed' },
  footer: { social: 'socialLinks' },
}

export function asContentObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/** Baca nilai field: kunci kanonik lebih dulu, lalu jatuh ke kunci legacy seed. */
export function readField(
  content: unknown,
  sectionKey: string,
  field: string,
): unknown {
  const obj = asContentObject(content)
  const primary = obj[field]
  if (primary !== undefined && primary !== null) return primary

  const legacy = ALIASES[sectionKey]?.[field]
  if (legacy !== undefined) {
    const fallback = obj[legacy]
    if (fallback !== undefined && fallback !== null) return fallback
  }
  return undefined
}

/** Gabungkan konten lama + field editor, sinkronkan alias legacy, dan tetapkan heading hero. */
export function buildContent(
  sectionKey: string,
  existing: unknown,
  title: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...asContentObject(existing), ...fields }
  if (sectionKey === 'hero') out.heading = title
  for (const [field, legacy] of Object.entries(ALIASES[sectionKey] ?? {})) {
    if (field in out) out[legacy] = out[field]
  }
  return out
}
