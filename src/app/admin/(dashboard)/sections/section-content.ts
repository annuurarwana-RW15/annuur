/**
 * Bentuk konten section.
 *
 * KANONIK (ditulis editor): `text`, `alamat`, `telp`, `jam`, `mapQuery`, `social`,
 * `subjudul`, `imageUrl` — plus `heading` (mirror `section.title` untuk hero;
 * judul hero TIDAK punya `content.judul`).
 * LEGACY (prisma/seed.ts): `body`, `address`, `phone`, `hours`, `mapEmbed`,
 * `socialLinks`, `subheading`, `image`, `heading` — satu-satunya set yang dijamin
 * ada di semua baris hari ini, karena seed memakai `update: {}` (re-seed tak pernah
 * menulis kunci kanonik) dan kunci kanonik hanya terisi saat admin menyimpan.
 *
 * Pembaca eksternal (renderer publik) WAJIB lewat `readField()` agar jatuh ke kunci
 * legacy bila kunci kanonik belum pernah ditulis. Bentuk galeri berbeda: seed
 * `images: string[]` (URL telanjang) vs editor `images: [{url, caption}]` —
 * pembaca harus menerima keduanya (`[]` valid untuk keduanya).
 *
 * Aliasi: kunci kanonik → kunci legacy yang disinkronkan oleh `buildContent`.
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

/**
 * API baca yang dipublikasikan untuk konsumen di luar editor (mis. renderer publik
 * Task 9): kunci kanonik lebih dulu, lalu jatuh ke kunci legacy seed.
 * Jangan membaca `content.<kunci>` langsung — baris yang belum pernah diedit hanya
 * punya kunci legacy.
 */
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
