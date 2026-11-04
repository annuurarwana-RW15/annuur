'use client'

export function PrintTrigger() {
  return (
    <div className="no-print mb-6 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
      <div>
        <p className="text-sm font-semibold text-neutral-900">
          Lembar Bukti Serah Terima Siap Dicetak
        </p>
        <p className="text-xs text-neutral-500">
          Format telah disesuaikan untuk kertas A4 (portrait) lengkap dengan kolom tanda tangan.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
        >
          🖨️ Cetak Dokumen
        </button>
      </div>
    </div>
  )
}

