'use client'

import { useEffect } from 'react'

/**
 * Hitung kunjungan artikel: satu POST `fire-and-forget` per mount.
 * Bersifat best-effort — tidak ada jaminan dua kunjungan hitung dua kali
 * (back/forward cache, bot, dsb.). Kegagalan tidak boleh mengganggu halaman.
 */
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ slug })
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(
          '/api/articles/view',
          new Blob([body], { type: 'application/json' }),
        )
        return
      }
      void fetch('/api/articles/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // pelacakan view best-effort: kegagalan diabaikan
    }
  }, [slug])

  return null
}
