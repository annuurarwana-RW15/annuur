'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Application Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span className="mb-3 block text-4xl">🕌</span>
        <h2 className="font-display text-xl font-bold text-neutral-900">
          Terjadi Kendala Memuat Halaman
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          Mohon maaf, sistem sedang mengalami kendala sementara saat memproses permintaan Anda.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-neutral-400">
            ID Referensi: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-green-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
          >
            Muat Ulang
          </button>
          <Link
            href="/"
            className="rounded-full border border-neutral-300 px-5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}

