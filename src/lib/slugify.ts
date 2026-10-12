/**
 * Ubah judul menjadi slug: huruf kecil ASCII, karakter non-alnum jadi `-`,
 * dash beruntun dirapikan dan dash di ujung dibuang.
 *
 * Murni tanpa dependensi (aman di-import dari komponen client — module ini
 * sengaja dipisah dari `slug.ts` yang membutuhkan `db`).
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
