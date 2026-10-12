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
