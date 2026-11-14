'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { ProposalStatus } from '@prisma/client'
import { formatRupiah } from '@/lib/format'
import { uploadImage } from '@/lib/upload-image'
import {
  saveProposal,
  deleteProposalAction,
  type SaveProposalInput,
} from './actions'
import type { ProposalFunding } from '@/lib/proposal'

export interface AdminProposalItem {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  coverImage: string | null
  filePdf: string | null
  filePdfSize: string | null
  targetAmount: number
  collectedManual: number
  categoryId: string | null
  category?: { id: string; name: string } | null
  programId: string | null
  program?: { id: string; title: string; slug: string } | null
  startDate: string | null
  endDate: string | null
  status: ProposalStatus
  isFeatured: boolean
  picName: string | null
  picPhone: string | null
  createdAt: string
  updatedAt: string
  funding: ProposalFunding
}

export interface AdminCategoryOption {
  id: string
  name: string
}

export interface AdminProgramOption {
  id: string
  title: string
}

interface ProposalAdminClientProps {
  initialProposals: AdminProposalItem[]
  categories: AdminCategoryOption[]
  programs: AdminProgramOption[]
}

const STATUS_LABELS: Record<ProposalStatus, { label: string; badgeClass: string }> = {
  DIBUKA: { label: 'Penggalangan Dibuka', badgeClass: 'bg-emerald-100 text-emerald-800' },
  TERPENUHI: { label: 'Target Terpenuhi', badgeClass: 'bg-blue-100 text-blue-800' },
  SELESAI: { label: 'Selesai Dilaksanakan', badgeClass: 'bg-purple-100 text-purple-800' },
  DRAFT: { label: 'Draft Internal', badgeClass: 'bg-slate-100 text-slate-700' },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function ProposalAdminClient({
  initialProposals,
  categories,
  programs,
}: ProposalAdminClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<AdminProposalItem | null>(null)
  const [formData, setFormData] = useState<SaveProposalInput>({
    title: '',
    summary: '',
    description: '',
    coverImage: '',
    filePdf: '',
    filePdfSize: '',
    targetAmount: 0,
    collectedManual: 0,
    categoryId: '',
    programId: '',
    status: 'DIBUKA',
    isFeatured: false,
    picName: '',
    picPhone: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Stats
  const total = initialProposals.length
  const openedCount = initialProposals.filter((p) => p.status === 'DIBUKA').length
  const fulfilledCount = initialProposals.filter((p) => p.status === 'TERPENUHI' || p.funding.isFulfilled).length
  const featuredCount = initialProposals.filter((p) => p.isFeatured).length

  function openCreateModal() {
    setEditingProposal(null)
    setFormData({
      title: '',
      summary: '',
      description: '',
      coverImage: '',
      filePdf: '',
      filePdfSize: '',
      targetAmount: 0,
      collectedManual: 0,
      categoryId: '',
      programId: '',
      status: 'DIBUKA',
      isFeatured: false,
      picName: '',
      picPhone: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(prop: AdminProposalItem) {
    setEditingProposal(prop)
    setFormData({
      id: prop.id,
      title: prop.title,
      summary: prop.summary,
      description: prop.description,
      coverImage: prop.coverImage || '',
      filePdf: prop.filePdf || '',
      filePdfSize: prop.filePdfSize || '',
      targetAmount: prop.targetAmount,
      collectedManual: prop.collectedManual,
      categoryId: prop.categoryId || '',
      programId: prop.programId || '',
      status: prop.status,
      isFeatured: prop.isFeatured,
      picName: prop.picName || '',
      picPhone: prop.picPhone || '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setFormError(null)
    try {
      const url = await uploadImage(file, 'proposals')
      setFormData((prev) => ({ ...prev, coverImage: url }))
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengunggah gambar cover')
    } finally {
      setIsUploading(false)
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setFormError('File proposal wajib bertipe PDF.')
      return
    }

    setIsUploading(true)
    setFormError(null)
    try {
      const url = await uploadImage(file, 'proposals')
      const sizeStr = formatBytes(file.size)
      setFormData((prev) => ({
        ...prev,
        filePdf: url,
        filePdfSize: sizeStr,
      }))
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengunggah file PDF proposal')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const res = await saveProposal(formData)
      if (res.ok) {
        setIsModalOpen(false)
        router.refresh()
      } else {
        setFormError(res.error || 'Terjadi kesalahan saat menyimpan proposal.')
      }
    })
  }

  async function handleDelete(prop: AdminProposalItem) {
    if (!window.confirm(`Hapus proposal "${prop.title}"?`)) return

    startTransition(async () => {
      const res = await deleteProposalAction(prop.id)
      if (res.ok) {
        router.refresh()
      } else {
        alert(res.error || 'Gagal menghapus proposal')
      }
    })
  }

  const filtered = initialProposals.filter((prop) => {
    if (statusFilter !== 'ALL' && prop.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = prop.title.toLowerCase().includes(q)
      const matchSummary = prop.summary.toLowerCase().includes(q)
      const matchPic = (prop.picName || '').toLowerCase().includes(q)
      if (!matchTitle && !matchSummary && !matchPic) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header & Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Pengelolaan Proposal Terbuka
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Kelola penggalangan dana program, unggah dokumen PDF resmi (RAB), atur target capaian, dan tampilkan di beranda.
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
          <span>Buat Proposal Baru</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Proposal</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Penggalangan Dibuka</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{openedCount}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Target Terpenuhi</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{fulfilledCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Featured Beranda</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{featuredCount}</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-hijau focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIBUKA">Penggalangan Dibuka</option>
            <option value="TERPENUHI">Target Terpenuhi</option>
            <option value="SELESAI">Selesai</option>
            <option value="DRAFT">Draft Internal</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari proposal / PIC..."
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">Tidak ada proposal yang sesuai.</p>
          <p className="mt-1 text-xs text-slate-500">Silakan buat proposal baru atau sesuaikan filter pencarian.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Proposal &amp; Kategori</th>
                  <th className="px-4 py-3">Status &amp; Beranda</th>
                  <th className="px-4 py-3 min-w-[200px]">Pencapaian Donasi</th>
                  <th className="px-4 py-3">Dokumen PDF</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prop) => {
                  const stat = STATUS_LABELS[prop.status] || STATUS_LABELS.DIBUKA

                  return (
                    <tr key={prop.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{prop.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{prop.summary}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {prop.category && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                              Pos: {prop.category.name}
                            </span>
                          )}
                          {prop.program && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                              Prog: {prop.program.title}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${stat.badgeClass}`}>
                          {stat.label}
                        </span>
                        <div className="mt-1">
                          {prop.isFeatured ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                              ★ Beranda
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standard</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-hijau">{formatRupiah(prop.funding.collectedTotal)}</span>
                          <span className="text-slate-500">dari {formatRupiah(prop.targetAmount)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${prop.funding.isFulfilled ? 'bg-emerald-500' : 'bg-hijau'}`}
                            style={{ width: `${prop.funding.percentage}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{prop.funding.percentage}%</span>
                          <span>
                            {prop.funding.onlineDonationsCount > 0 ? `${prop.funding.onlineDonationsCount} Donasi Online` : 'Donasi Offline'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {prop.filePdf ? (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                              PDF {prop.filePdfSize ? `(${prop.filePdfSize})` : ''}
                            </span>
                            <a
                              href={prop.filePdf}
                              target="_blank"
                              rel="noreferrer"
                              className="text-hijau hover:underline text-[11px] font-semibold"
                            >
                              Lihat
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Belum diunggah</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(prop)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(prop)}
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
          <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-800">
                {editingProposal ? 'Edit Proposal Terbuka' : 'Buat Proposal Terbuka Baru'}
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
                  Judul Proposal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Pengadaan Genset Otomatis 25 kVA"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ringkasan Singkat (Summary) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Ringkasan 1-2 kalimat untuk kartu & cuplikan di beranda"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Lengkap / Rencana Anggaran (RAB) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan latar belakang, rincian item kebutuhan, spesifikasi teknis, dan timeline..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                />
              </div>

              {/* Uploads Section: Cover Image & File PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {/* Cover Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Foto / Gambar Cover (Opsional)
                  </label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => coverInputRef.current?.click()}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      {formData.coverImage ? 'Ganti Cover' : 'Pilih Foto Cover'}
                    </button>
                    {formData.coverImage && (
                      <span className="text-[11px] text-emerald-600 font-medium">✓ Tersimpan</span>
                    )}
                  </div>
                  {formData.coverImage && (
                    <div className="mt-2 relative h-16 w-28 rounded-lg overflow-hidden border border-slate-200">
                      <Image src={formData.coverImage} alt="Cover" fill className="object-cover" />
                    </div>
                  )}
                </div>

                {/* PDF File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unggah Dokumen PDF Resmi Proposal
                  </label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => pdfInputRef.current?.click()}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      {formData.filePdf ? 'Ganti Berkas PDF' : 'Pilih File PDF'}
                    </button>
                    {formData.filePdf && (
                      <span className="text-[11px] text-emerald-600 font-medium">
                        ✓ PDF {formData.filePdfSize ? `(${formData.filePdfSize})` : ''}
                      </span>
                    )}
                  </div>
                  {formData.filePdf && (
                    <div className="mt-1 text-[11px] text-slate-500 truncate">
                      Path: {formData.filePdf}
                    </div>
                  )}
                </div>
              </div>

              {/* Targets and Manual Collections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Anggaran RAB (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="100000"
                    value={formData.targetAmount || ''}
                    onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                    placeholder="Contoh: 50000000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Donasi Manual / Tunai Masuk (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={formData.collectedManual || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        collectedManual: e.target.value ? Number(e.target.value) : 0,
                      })
                    }
                    placeholder="Donasi tunai / material langsung"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category and Program Relations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tautkan ke Kategori Kas (Donasi Online)
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="">-- Tanpa Kategori Kas Khusus --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Donasi online berstatus terkonfirmasi di kategori ini otomatis menambah capaian proposal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tautkan ke Program Kerja (Opsional)
                  </label>
                  <select
                    value={formData.programId || ''}
                    onChange={(e) => setFormData({ ...formData, programId: e.target.value || null })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="">-- Tanpa Kaitan Program Kerja --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status and PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Proposal
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  >
                    <option value="DIBUKA">Penggalangan Dibuka</option>
                    <option value="TERPENUHI">Target Terpenuhi</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="DRAFT">Draft Internal (Tidak Tampil di Publik)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    value={formData.picName ?? ''}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    placeholder="Nama pengurus"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WA PIC
                  </label>
                  <input
                    type="text"
                    value={formData.picPhone ?? ''}
                    onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-hijau focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isFeaturedProposal"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded-sm border-slate-300 text-hijau focus:ring-hijau"
                />
                <label htmlFor="isFeaturedProposal" className="text-xs font-semibold text-slate-700">
                  Tampilkan cuplikan proposal ini di Beranda (Homepage Featured)
                </label>
              </div>

              {/* Action Buttons */}
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
                  disabled={isPending || isUploading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-hijau px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-hijau-tua transition disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
