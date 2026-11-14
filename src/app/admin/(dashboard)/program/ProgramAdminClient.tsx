'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ProgramPeriodType,
  ProgramCategory,
  ProgramStatus,
} from '@prisma/client'
import { formatRupiah } from '@/lib/format'
import {
  saveProgram,
  updateQuickProgress,
  deleteProgramAction,
  type SaveProgramInput,
} from './actions'

export interface AdminProgramItem {
  id: string
  title: string
  slug: string
  description: string
  periodType: ProgramPeriodType
  category: ProgramCategory
  status: ProgramStatus
  progress: number
  targetDate: string | null
  budgetEstimate: number | null
  picName: string | null
  picPhone: string | null
  order: number
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  proposals?: Array<{
    id: string
    title: string
    slug: string
  }>
}

interface ProgramAdminClientProps {
  initialPrograms: AdminProgramItem[]
}

const CATEGORY_LABELS: Record<ProgramCategory, string> = {
  IMARAH: 'Imarah (Kemakmuran)',
  RIAYAH: 'Riayah (Sarana/Fisik)',
  IDARAH: 'Idarah (Manajemen)',
  SOSIAL: 'Sosial (Pelayanan Umat)',
}

const STATUS_LABELS: Record<ProgramStatus, string> = {
  DIRENCANAKAN: 'Direncanakan',
  BERJALAN: 'Sedang Berjalan',
  SELESAI: 'Selesai',
  DITUNDA: 'Ditunda',
}

export function ProgramAdminClient({ initialPrograms }: ProgramAdminClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<ProgramPeriodType | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<ProgramStatus | 'ALL'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<AdminProgramItem | null>(null)
  const [formData, setFormData] = useState<SaveProgramInput>({
    title: '',
    description: '',
    periodType: 'PENDEK',
    category: 'IMARAH',
    status: 'DIRENCANAKAN',
    progress: 0,
    targetDate: '',
    budgetEstimate: null,
    picName: '',
    picPhone: '',
    isFeatured: false,
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Local progress state for snappy slider dragging
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({})

  // Stats
  const total = initialPrograms.length
  const pendekCount = initialPrograms.filter((p) => p.periodType === 'PENDEK').length
  const panjangCount = initialPrograms.filter((p) => p.periodType === 'PANJANG').length
  const selesaiCount = initialPrograms.filter((p) => p.status === 'SELESAI' || p.progress === 100).length

  function openCreateModal() {
    setEditingProgram(null)
    setFormData({
      title: '',
      description: '',
      periodType: 'PENDEK',
      category: 'IMARAH',
      status: 'DIRENCANAKAN',
      progress: 0,
      targetDate: '',
      budgetEstimate: null,
      picName: '',
      picPhone: '',
      isFeatured: false,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(prog: AdminProgramItem) {
    setEditingProgram(prog)
    setFormData({
      id: prog.id,
      title: prog.title,
      description: prog.description,
      periodType: prog.periodType,
      category: prog.category,
      status: prog.status,
      progress: prog.progress,
      targetDate: prog.targetDate ? prog.targetDate.slice(0, 10) : '',
      budgetEstimate: prog.budgetEstimate,
      picName: prog.picName || '',
      picPhone: prog.picPhone || '',
      isFeatured: prog.isFeatured,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const res = await saveProgram(formData)
      if (res.ok) {
        setIsModalOpen(false)
        router.refresh()
      } else {
        setFormError(res.error || 'Terjadi kesalahan saat menyimpan program.')
      }
    })
  }

  async function handleProgressChange(id: string, newProgress: number) {
    setLocalProgress((prev) => ({ ...prev, [id]: newProgress }))
    startTransition(async () => {
      await updateQuickProgress(id, newProgress)
      router.refresh()
    })
  }

  async function handleDelete(prog: AdminProgramItem) {
    if (!window.confirm(`Hapus program "${prog.title}"?`)) return

    startTransition(async () => {
      const res = await deleteProgramAction(prog.id)
      if (res.ok) {
        router.refresh()
      } else {
        alert(res.error || 'Gagal menghapus program')
      }
    })
  }

  const filtered = initialPrograms.filter((prog) => {
    if (filterPeriod !== 'ALL' && prog.periodType !== filterPeriod) return false
    if (filterStatus !== 'ALL' && prog.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = prog.title.toLowerCase().includes(q)
      const matchDesc = prog.description.toLowerCase().includes(q)
      const matchPic = (prog.picName || '').toLowerCase().includes(q)
      if (!matchTitle && !matchDesc && !matchPic) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Pengelolaan Program Kerja
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Pantau rencana kerja tahunan dan jangka panjang DKM, kelola capaian progress (0-100%), dan PIC penanggung jawab.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-hijau px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-hijau-tua transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          <span>Tambah Program Baru</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Program</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Jangka Pendek</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{pendekCount}</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Jangka Panjang</p>
          <p className="mt-1 text-2xl font-bold text-purple-800">{panjangCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Selesai</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{selesaiCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as ProgramPeriodType | 'ALL')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-hijau focus:outline-hidden"
          >
            <option value="ALL">Semua Periode</option>
            <option value="PENDEK">Jangka Pendek</option>
            <option value="PANJANG">Jangka Panjang</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProgramStatus | 'ALL')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-hijau focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIRENCANAKAN">Direncanakan</option>
            <option value="BERJALAN">Sedang Berjalan</option>
            <option value="SELESAI">Selesai</option>
            <option value="DITUNDA">Ditunda</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul / deskripsi / PIC..."
            className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-hijau focus:outline-hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Programs List Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">Tidak ada program yang ditemukan.</p>
          <p className="mt-1 text-xs text-slate-500">Silakan tambahkan program baru atau sesuaikan filter pencarian.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Program &amp; Bidang</th>
                  <th className="px-4 py-3">Periode &amp; Status</th>
                  <th className="px-4 py-3 min-w-[200px]">Capaian Progress</th>
                  <th className="px-4 py-3">Anggaran &amp; PIC</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prog) => {
                  const currentProgVal =
                    localProgress[prog.id] !== undefined
                      ? localProgress[prog.id]
                      : prog.progress

                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{prog.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{prog.description}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {CATEGORY_LABELS[prog.category]}
                          </span>
                          {prog.isFeatured && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              ★ Featured
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            prog.periodType === 'PANJANG'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-teal-100 text-teal-700'
                          }`}
                        >
                          {prog.periodType === 'PANJANG' ? 'Jangka Panjang' : 'Jangka Pendek'}
                        </span>
                        <div className="mt-1 text-[11px] font-medium text-slate-600">
                          {STATUS_LABELS[prog.status]}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-hijau">{currentProgVal}%</span>
                          <span className="text-slate-400">Geser untuk ubah</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={currentProgVal}
                          onChange={(e) => handleProgressChange(prog.id, Number(e.target.value))}
                          className="h-2 w-full cursor-pointer accent-hijau"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        {prog.budgetEstimate ? (
                          <div className="font-semibold text-slate-800">
                            {formatRupiah(prog.budgetEstimate)}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        {prog.picName && (
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            PIC: <span className="font-medium text-slate-700">{prog.picName}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(prog)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(prog)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-800">
                {editingProgram ? 'Edit Program Kerja' : 'Tambah Program Kerja Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Program <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Pengadaan Genset Otomatis Masjid"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Program <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan tujuan, ruang lingkup, dan manfaat program kerja ini..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Periode
                  </label>
                  <select
                    value={formData.periodType}
                    onChange={(e) => setFormData({ ...formData, periodType: e.target.value as ProgramPeriodType })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="PENDEK">Jangka Pendek (Tahunan)</option>
                    <option value="PANJANG">Jangka Panjang (Strategis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bidang / Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProgramCategory })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="IMARAH">Imarah (Kemakmuran Ibadah)</option>
                    <option value="RIAYAH">Riayah (Sarana / Fisik)</option>
                    <option value="IDARAH">Idarah (Manajemen)</option>
                    <option value="SOSIAL">Sosial (Pelayanan Umat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pelaksanaan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProgramStatus })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="DIRENCANAKAN">Direncanakan</option>
                    <option value="BERJALAN">Sedang Berjalan</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="DITUNDA">Ditunda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capaian Progress: <strong className="text-hijau">{formData.progress}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    className="h-2 w-full cursor-pointer accent-hijau mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Anggaran (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={formData.budgetEstimate ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budgetEstimate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Contoh: 25000000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Waktu Rampung
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC (Penanggung Jawab)
                  </label>
                  <input
                    type="text"
                    value={formData.picName ?? ''}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    placeholder="Nama pengurus DKM"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp PIC
                  </label>
                  <input
                    type="text"
                    value={formData.picPhone ?? ''}
                    onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded-sm border-slate-300 text-hijau focus:ring-hijau"
                />
                <label htmlFor="isFeatured" className="text-xs font-medium text-slate-700">
                  Tandai sebagai program prioritas / unggulan
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-hijau px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-hijau-tua transition disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
