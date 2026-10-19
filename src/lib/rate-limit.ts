interface WindowEntry {
  count: number
  resetAt: number
}

const windows = new Map<string, WindowEntry>()
const MAX_TRACKED_KEYS = 5_000

function prune(now: number): void {
  for (const [key, entry] of windows) {
    if (now >= entry.resetAt) windows.delete(key)
  }
}

/**
 * Rate limiter in-memory sederhana (per proses, tanpa Redis): catat pemakaian
 * `key` dan kembalikan `false` bila `limit` terlampaui dalam `windowMs` terakhir.
 * Dipakai `POST /api/articles/view` (Task 12) dan `POST /api/donasi` (Task 16).
 */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now >= entry.resetAt) {
    if (windows.size >= MAX_TRACKED_KEYS) prune(now)
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

/** Kosongkan seluruh window (dipakai test; aman dipanggil di produksi). */
export function resetRateLimits(): void {
  windows.clear()
}

/** Kosongkan satu key (mis. setelah percobaan terakhir berhasil). */
export function resetHit(key: string): void {
  windows.delete(key)
}

/**
 * true bila `key` masih di bawah `limit` — TANPA menambah hitungan.
 * Untuk alur yang hanya boleh menghitung kegagalan (mis. login): cek dengan
 * `canHit`, catat kegagalan dengan `hit`. Jendela mengikuti `hit` pemilik
 * entry, sehingga `windowMs` tidak perlu diulang di sini.
 */
export function canHit(key: string, limit: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)
  if (!entry || now >= entry.resetAt) return true
  return entry.count < limit
}

/** Sumber header apa pun yang punya `.get()` (Request.headers, ReadonlyHeaders). */
type HeaderSource = { get(name: string): string | null }

/**
 * IP klien untuk kunci rate-limit. Utamakan `x-real-ip` (di-append proxy
 * tepercaya, mis. Vercel), lalu hop paling kanan `x-forwarded-for` — hop
 * kiri paling mudah dipalsukan client sehingga TIDAK dipakai — terakhir
 * `'unknown'`.
 */
export function ipFromHeaders(headers: HeaderSource): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return 'unknown'
}

export function getClientIp(req: Request): string {
  return ipFromHeaders(req.headers)
}
