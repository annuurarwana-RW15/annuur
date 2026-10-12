'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function Tracker() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const payload = JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
      })
      navigator.sendBeacon(
        '/api/track',
        new Blob([payload], { type: 'application/json' }),
      )
    } catch {
      // pelacakan fire-and-forget: kegagalan (mis. rute belum ada) tidak boleh mengganggu halaman
    }
  }, [pathname])

  return null
}
