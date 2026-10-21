/**
 * Helper upload gambar di sisi klien — dipakai bersama oleh ImageField (sampul)
 * dan RichTextEditor (gambar sisipan artikel) agar alur & pesan error seragam.
 */

/** Tipe gambar yang diizinkan. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Batas ukuran gambar: 5MB. */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/**
 * Validasi file gambar. Mengembalikan pesan error siap tampil, atau null bila valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.'
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'Ukuran file maksimal 5MB.'
  }
  return null
}

/**
 * Unggah gambar lewat `/api/upload` (minta presigned URL lalu PUT ke penyimpanan).
 * Mengembalikan URL publik; melempar `Error` dengan pesan siap ditampilkan.
 */
export async function uploadImage(file: File, prefix = 'uploads'): Promise<string> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      prefix,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Upload gagal')
  }

  const putRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error('Upload ke penyimpanan gagal')
  }

  return data.publicUrl
}
