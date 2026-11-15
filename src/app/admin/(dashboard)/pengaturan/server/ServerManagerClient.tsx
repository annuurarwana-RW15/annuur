'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { ServerDiagnosticsData } from '@/lib/server-diagnostics'
import type { MaintenanceConfig } from '@/lib/maintenance'
import {
  fetchFreshDiagnosticsAction,
  updateMaintenanceAction,
  validateBackupFileAction,
  restoreDatabaseAction,
} from './actions'

export interface ServerManagerClientProps {
  initialDiagnostics: ServerDiagnosticsData
  initialMaintenance: MaintenanceConfig
}

export function ServerManagerClient({
  initialDiagnostics,
  initialMaintenance,
}: ServerManagerClientProps) {
  // State Diagnostik
  const [diagnostics, setDiagnostics] = useState<ServerDiagnosticsData>(initialDiagnostics)
  const [isRefreshingDiag, startRefreshDiag] = useTransition()

  // State Maintenance
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(initialMaintenance)
  const [isSavingMaint, startSaveMaint] = useTransition()
  const [maintFeedback, setMaintFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // State Backup
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false)

  // State Restore
  const [restoreFileJson, setRestoreFileJson] = useState<string>('')
  const [restoreFileName, setRestoreFileName] = useState<string>('')
  const [restorePreview, setRestorePreview] = useState<{
    valid: boolean
    error?: string
    summary?: Record<string, number>
  } | null>(null)
  const [isValidatingFile, startValidateFile] = useTransition()
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [isRestoring, startRestore] = useTransition()
  const [restoreFeedback, setRestoreFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // Handlers
  const handleRefreshDiagnostics = () => {
    startRefreshDiag(async () => {
      try {
        const fresh = await fetchFreshDiagnosticsAction()
        setDiagnostics(fresh)
      } catch (err) {
        console.error('Gagal menyegarkan diagnostik:', err)
      }
    })
  }

  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault()
    setMaintFeedback(null)
    startSaveMaint(async () => {
      const res = await updateMaintenanceAction(maintenance)
      if (res.ok) {
        setMaintFeedback({ ok: true, msg: 'Pengaturan mode pemeliharaan berhasil disimpan' })
      } else {
        setMaintFeedback({ ok: false, msg: res.error || 'Gagal menyimpan pengaturan' })
      }
    })
  }

  const handleDownloadBackup = () => {
    setIsDownloadingBackup(true)
    // Unduh file secara direct dari endpoint API
    window.location.href = '/api/admin/server/backup'
    setTimeout(() => {
      setIsDownloadingBackup(false)
    }, 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreFileName(file.name)
    setRestorePreview(null)
    setRestoreFeedback(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRestoreFileJson(text)
      startValidateFile(async () => {
        const res = await validateBackupFileAction(text)
        setRestorePreview(res)
      })
    }
    reader.readAsText(file)
  }

  const handleConfirmRestore = () => {
    if (confirmInput.trim().toUpperCase() !== 'PULIHKAN') return
    setRestoreFeedback(null)

    startRestore(async () => {
      const res = await restoreDatabaseAction(restoreFileJson, confirmInput)
      setIsRestoreModalOpen(false)
      setConfirmInput('')
      if (res.ok) {
        setRestoreFeedback({
          ok: true,
          msg: 'Basis data berhasil dipulihkan secara menyeluruh. Seluruh data telah diperbarui.',
        })
        handleRefreshDiagnostics()
      } else {
        setRestoreFeedback({
          ok: false,
          msg: res.error || 'Gagal memulihkan basis data',
        })
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigasi Atas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/admin/pengaturan" className="hover:text-green-900 transition">
              Pengaturan
            </Link>
            <span>/</span>
            <span className="font-semibold text-neutral-800">Server &amp; Database</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">
            Server, Maintenance &amp; Database
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Pemantauan diagnostik sistem, mode pemeliharaan publik, pencadangan (backup), dan pemulihan (restore) data.
          </p>
        </div>

        <Link
          href="/admin/pengaturan"
          className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-green-900 hover:text-green-700 transition"
        >
          ← Kembali ke Pengaturan Umum
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 1. KARTU PEMANTAUAN SERVER & DIAGNOSTIK */}
      {/* ========================================================================= */}
      <section className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-lg">
              🩺
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Diagnostik &amp; Kondisi Server
              </h2>
              <p className="text-xs text-neutral-500">
                Pemeriksaan status koneksi basis data, memori, dan kapasitas penyimpanan media.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshDiagnostics}
            disabled={isRefreshingDiag}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 disabled:opacity-50 transition"
          >
            <span className={`inline-block ${isRefreshingDiag ? 'animate-spin' : ''}`}>🔄</span>
            <span>{isRefreshingDiag ? 'Memeriksa...' : 'Segarkan Metrik'}</span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status Database */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Koneksi PostgreSQL</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  diagnostics.database.status === 'connected'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    diagnostics.database.status === 'connected' ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                />
                <span>{diagnostics.database.status === 'connected' ? 'Terhubung' : 'Terputus'}</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-neutral-900">
                {diagnostics.database.latencyMs}
              </span>
              <span className="text-xs text-neutral-500">ms latensi</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              {diagnostics.database.error ? diagnostics.database.error : 'Koneksi Prisma aktif'}
            </p>
          </div>

          {/* Penyimpanan Uploads */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
            <span className="text-xs font-medium text-neutral-500">Berkas Media &amp; Uploads</span>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-neutral-900">
                {diagnostics.storage.formattedSize}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {diagnostics.storage.totalFiles} berkas di folder <code>public/uploads</code>
            </p>
          </div>

          {/* Memori Node.js */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
            <span className="text-xs font-medium text-neutral-500">Penggunaan Memori (Heap)</span>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-neutral-900">
                {diagnostics.runtime.memory.heapUsedMb}
              </span>
              <span className="text-xs text-neutral-500">/ {diagnostics.runtime.memory.heapTotalMb} MB</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              RSS Total: {diagnostics.runtime.memory.rssMb} MB
            </p>
          </div>

          {/* Waktu Aktif Server (Uptime) */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
            <span className="text-xs font-medium text-neutral-500">Waktu Aktif (Uptime)</span>
            <div className="mt-3 text-sm font-bold text-neutral-900 line-clamp-1">
              {diagnostics.runtime.uptimeFormatted}
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              Node {diagnostics.runtime.nodeVersion} ({diagnostics.runtime.env})
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. KARTU MAINTENANCE MODE (MODE PEMELIHARAAN) */}
      {/* ========================================================================= */}
      <section className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-black/5 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg">
            🚧
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Mode Pemeliharaan (Maintenance Mode)
            </h2>
            <p className="text-xs text-neutral-500">
              Alihkan pengunjung umum ke halaman pemberitahuan sementara saat situs sedang diperbarui.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveMaintenance} className="mt-5 space-y-4">
          {/* Saklar Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200/90 bg-neutral-50/70 p-4">
            <div>
              <span className="text-sm font-bold text-neutral-900">Status Mode Pemeliharaan</span>
              <p className="text-xs text-neutral-500">
                {maintenance.enabled
                  ? 'Aktif — Pengunjung publik melihat halaman pemeliharaan (Admin tetap dapat bypass).'
                  : 'Nonaktif — Situs publik beroperasi normal dan dapat diakses semua pengunjung.'}
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={maintenance.enabled}
                onChange={(e) => setMaintenance({ ...maintenance, enabled: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-neutral-300 peer-checked:bg-amber-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Judul Pengumuman
              </label>
              <input
                type="text"
                value={maintenance.title}
                onChange={(e) => setMaintenance({ ...maintenance, title: e.target.value })}
                required
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-hidden focus:ring-1 focus:ring-green-900"
                placeholder="Situs Sedang Dalam Pemeliharaan Berkala"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Estimasi Selesai (Opsional)
              </label>
              <input
                type="text"
                value={maintenance.estimatedEnd || ''}
                onChange={(e) => setMaintenance({ ...maintenance, estimatedEnd: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-hidden focus:ring-1 focus:ring-green-900"
                placeholder="Contoh: 16 November 2026, pukul 15.00 WIB"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Pesan untuk Jamaah / Pengunjung
            </label>
            <textarea
              rows={3}
              value={maintenance.message}
              onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
              required
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-hidden focus:ring-1 focus:ring-green-900"
              placeholder="Jelaskan secara santun bahwa sistem sedang ditingkatkan kapasitasnya..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingMaint}
              className="inline-flex items-center gap-2 rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800 disabled:opacity-50 transition"
            >
              <span>{isSavingMaint ? 'Menyimpan...' : 'Simpan Pengaturan Maintenance'}</span>
            </button>

            {maintFeedback && (
              <span
                className={`text-xs font-medium ${
                  maintFeedback.ok ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {maintFeedback.msg}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* 3. KARTU PENCADANGAN BASIS DATA (BACKUP) */}
      {/* ========================================================================= */}
      <section className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-black/5 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-lg">
            💾
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Pencadangan Basis Data (Backup Database)
            </h2>
            <p className="text-xs text-neutral-500">
              Unduh snapshot salinan lengkap seluruh data database dalam format <code>.json</code> langsung ke komputer lokal.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-blue-950">
              Snapshot Cadangan JSON Lengkap
            </h3>
            <p className="mt-0.5 text-xs text-blue-900/80 leading-relaxed max-w-2xl">
              Mencakup seluruh tabel: Transaksi Kas, Donasi, Pengguna, Artikel Berita, Program Kerja, Proposal, Inventaris, dan Pengaturan Situs.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isDownloadingBackup}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 disabled:opacity-50 transition shrink-0"
          >
            <span>📥</span>
            <span>{isDownloadingBackup ? 'Menyiapkan Berkas...' : 'Unduh Cadangan (.json)'}</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. KARTU PEMULIHAN BASIS DATA (RESTORE) */}
      {/* ========================================================================= */}
      <section className="rounded-xl border border-red-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-black/5 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-lg">
            ⚠️
          </span>
          <div>
            <h2 className="text-base font-semibold text-red-950">
              Pemulihan Basis Data (Restore Database)
            </h2>
            <p className="text-xs text-neutral-500">
              Pulihkan basis data dari berkas cadangan JSON yang sebelumnya telah diunduh.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Perhatian:</span> Proses pemulihan akan menimpa data yang ada saat ini dengan data yang ada pada berkas cadangan. Pastikan Anda telah membuat backup terbaru sebelum melakukan tindakan ini.
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Pilih Berkas Cadangan (.json)
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-xs text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200"
            />
          </div>

          {isValidatingFile && (
            <p className="text-xs text-neutral-500 animate-pulse">Memeriksa struktur berkas cadangan...</p>
          )}

          {restorePreview && (
            <div
              className={`rounded-xl border p-4 text-xs ${
                restorePreview.valid
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                  : 'border-red-200 bg-red-50/60 text-red-900'
              }`}
            >
              {restorePreview.valid ? (
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <span>✓</span>
                    <span>Berkas Cadangan Valid ({restoreFileName})</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Ringkasan data yang siap dipulihkan:
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {Object.entries(restorePreview.summary || {}).map(([table, count]) => (
                      <div key={table} className="rounded bg-white/70 px-2 py-1 border border-emerald-200/50">
                        <span className="font-semibold text-neutral-700">{table}: </span>
                        <span className="font-mono text-emerald-900 font-bold">{count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-200/60">
                    <button
                      type="button"
                      onClick={() => setIsRestoreModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
                    >
                      <span>Lanjutkan ke Pemulihan Database →</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <span>✕</span>
                  <span>{restorePreview.error || 'Berkas cadangan tidak valid'}</span>
                </div>
              )}
            </div>
          )}

          {restoreFeedback && (
            <div
              className={`rounded-lg p-3 text-xs font-semibold ${
                restoreFeedback.ok
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {restoreFeedback.msg}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI BERBAHAYA (RESTORE) */}
      {/* ========================================================================= */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-base text-neutral-900">
                Konfirmasi Pemulihan Database
              </h3>
            </div>

            <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
              Tindakan ini akan <strong>menghapus data saat ini</strong> dan menggantikannya dengan isi berkas cadangan <code className="bg-neutral-100 px-1 py-0.5 rounded font-bold">{restoreFileName}</code>. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-4 rounded-lg bg-red-50 p-3 border border-red-200 text-xs text-red-800">
              Ketik kata <span className="font-mono font-bold tracking-wider">PULIHKAN</span> di bawah untuk mengaktifkan tombol eksekusi:
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Ketik PULIHKAN"
              className="mt-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold tracking-wider text-neutral-900 uppercase focus:border-red-600 focus:outline-hidden focus:ring-1 focus:ring-red-600"
            />

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false)
                  setConfirmInput('')
                }}
                disabled={isRestoring}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={confirmInput.trim().toUpperCase() !== 'PULIHKAN' || isRestoring}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-40 transition"
              >
                <span>{isRestoring ? 'Memulihkan Basis Data...' : 'Ya, Pulihkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
