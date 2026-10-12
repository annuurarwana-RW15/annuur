'use client'

import { useEffect } from 'react'

export function Tracker() {
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || null,
      })
      navigator.sendBeacon(
        '/api/track',
        new Blob([payload], { type: 'application/json' }),
      )
    } catch {
      // pelacakan fire-and-forget: kegagalan (mis. rute belum ada) tidak boleh mengganggu halaman
    }
  }, [])

  return null
}
