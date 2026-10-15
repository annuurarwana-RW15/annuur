import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Fallback penyimpanan lokal SEBELUM R2 dikonfigurasi.
 *
 * Dipakai `/api/upload` & `/api/upload-public`: bila `R2_*` masih kosong, kontrak
 * tidak berubah (`{uploadUrl, publicUrl, key}`) — hanya `uploadUrl` menunjuk ke
 * endpoint lokal (`/api/upload-local`) yang menulis file ke `public/uploads/`,
 * dan `publicUrl` jadi path relatif `/uploads/<key>`. Begitu `R2_*` terisi,
 * jalur presigned R2 dipakai kembali tanpa perubahan klien.
 */
const R2_ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
] as const

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

export const LOCAL_MAX_SIZE = 5 * 1024 * 1024

/** Key hasil `r2Key()`: segmen lowercase + nama file ber-ekstensi. */
const KEY_RE = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/

export type LocalScope = 'admin' | 'public'

export function isR2Configured(): boolean {
  return R2_ENV_KEYS.every((key) => Boolean(process.env[key]?.trim()))
}

export function localPublicUrl(key: string): string {
  return `/uploads/${key}`
}

export function localUploadUrl(scope: LocalScope, key: string): string {
  return `/api/upload-local?scope=${scope}&key=${encodeURIComponent(key)}`
}

export type LocalWriteResult = { ok: true } | { ok: false; error: string }

function baseDir(): string {
  return path.join(process.cwd(), 'public', 'uploads')
}

/**
 * Tulis file ke `public/uploads/<key>` dengan validasi bertingkat
 * (key, tipe, ekstensi, ukuran) + guard path traversal.
 */
export async function writeLocalUpload(
  key: string,
  contentType: string,
  data: ArrayBuffer,
): Promise<LocalWriteResult> {
  const dot = key.lastIndexOf('.')
  if (dot <= 0) return { ok: false, error: 'Key tidak valid' }

  const stem = key.slice(0, dot)
  const ext = key.slice(dot + 1)
  if (!KEY_RE.test(stem) || !/^[a-z0-9]+$/.test(ext)) {
    return { ok: false, error: 'Key tidak valid' }
  }

  const allowedExts = ALLOWED_TYPES[contentType]
  if (!allowedExts) return { ok: false, error: 'Tipe file tidak diizinkan' }

  if (!allowedExts.includes(ext)) {
    return { ok: false, error: `Ekstensi .${ext} tidak diizinkan` }
  }

  if (data.byteLength === 0) return { ok: false, error: 'File kosong' }
  if (data.byteLength > LOCAL_MAX_SIZE) {
    return { ok: false, error: 'Ukuran file maksimal 5MB' }
  }

  const target = path.join(baseDir(), key)
  if (!path.resolve(target).startsWith(path.resolve(baseDir()) + path.sep)) {
    return { ok: false, error: 'Key tidak valid' }
  }

  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, Buffer.from(data))
  return { ok: true }
}
