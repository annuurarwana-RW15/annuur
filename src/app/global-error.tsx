'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 font-sans text-neutral-900">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <span className="mb-3 block text-4xl">🕌</span>
          <h1 className="text-xl font-bold">Terjadi Kendala pada Sistem</h1>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">
            Mohon maaf atas ketidaknyamanannya. Halaman gagal dimuat secara normal.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[10px] text-neutral-400">
              ID Referensi: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-block rounded-full bg-green-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  )
}

