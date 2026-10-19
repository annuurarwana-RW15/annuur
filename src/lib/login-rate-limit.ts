import { canHit, hit, resetHit } from '@/lib/rate-limit'

/**
 * Kebijakan rate-limit login admin: maksimal 5 percobaan GAGAL per IP dalam
 * 15 menit. Hanya kegagalan yang dihitung — login berhasil me-reset window
 * sehingga bendahara yang bolak-balik masuk tidak terkunci.
 *
 * Ditegakkan di dua lapis:
 * - `authorize` (src/lib/auth.ts) — choke point tunggal; menutup jalur
 *   `POST /api/auth/callback/credentials` langsung, bukan hanya form admin.
 * - server action `login` — cek awal agar pengguna melihat pesan jelas,
 *   bukan "Email atau password salah" yang menyesatkan.
 */
export const LOGIN_RATE_LIMIT = 5
export const LOGIN_RATE_WINDOW_MS = 15 * 60_000
export const LOGIN_RATE_MESSAGE =
  'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.'

function loginKey(ip: string): string {
  return `login:${ip}`
}

export function isLoginRateLimited(ip: string): boolean {
  return !canHit(loginKey(ip), LOGIN_RATE_LIMIT)
}

export function recordLoginFailure(ip: string): void {
  hit(loginKey(ip), LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS)
}

export function clearLoginRateLimit(ip: string): void {
  resetHit(loginKey(ip))
}
