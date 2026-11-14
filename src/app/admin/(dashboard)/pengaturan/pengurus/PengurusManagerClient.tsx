'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import ImageField from '@/components/admin/ImageField'
import {
  type PengurusItem,
  type PengurusKategori,
  KATEGORI_LABELS,
} from '@/lib/pengurus'
import type { JumatRow } from '@/app/admin/(dashboard)/sections/jumat-items'
import {
  savePengurusAction,
  resetPengurusAction,
  saveManualKhotibScheduleAction,
} from './actions'
import {
  findNextFriday,
  formatIsoDate,
  generateJumatSchedule,
} from '@/lib/khotib-generator'
import { formatDateID } from '@/lib/format'

interface Props {
  initialPengurus: PengurusItem[]
  initialJadwalJumat: JumatRow[]
}

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-800 focus:outline-none focus:ring-1 focus:ring-green-800'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1'

export function PengurusManagerClient({
  initialPengurus,
  initialJadwalJumat,
}: Props) {
  const [activeTab, setActiveTab] = useState<'pengurus' | 'generator' | 'jadwal'>('pengurus')
  const [pengurusList, setPengurusList] = useState<PengurusItem[]>(initialPengurus)
  const [jadwalJumat, setJadwalJumat] = useState<JumatRow[]>(initialJadwalJumat)
  const [filterKategori, setFilterKategori] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [editingItem, setEditingItem] = useState<PengurusItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Khotib Generator State
  const defaultStartDate = useMemo(() => formatIsoDate(findNextFriday()), [])
  const [genStartDate, setGenStartDate] = useState(defaultStartDate)
  const [genWeeks, setGenWeeks] = useState(4)
  const [genKhotibInput, setGenKhotibInput] = useState(() => {
    const fromPengurus = initialPengurus
      .filter((p) => p.isKhotib && p.isActive)
      .map((p) => p.nama)
    return fromPengurus.length > 0
      ? fromPengurus.join('\n')
      : 'Ust. Abdul Ghofur, Lc.\nUst. M. Ridwan, S.Ag.\nH. Ahmad Subagio, M.Pd.'
  })
  const [genImamInput, setGenImamInput] = useState(() => {
    const fromPengurus = initialPengurus
      .filter((p) => p.isImam && p.isActive)
      .map((p) => p.nama)
    return fromPengurus.length > 0
      ? fromPengurus.join('\n')
      : 'Ust. Abdul Ghofur, Lc.\nUst. M. Ridwan, S.Ag.\nSyahrul Ramadhan'
  })
  const [generatedPreview, setGeneratedPreview] = useState<JumatRow[]>([])

  // Filtered Pengurus
  const filteredPengurus = useMemo(() => {
    return pengurusList.filter((item) => {
      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori
      const matchSearch =
        searchQuery === '' ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jabatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tugas.toLowerCase().includes(searchQuery.toLowerCase())
      return matchKategori && matchSearch
    })
  }, [pengurusList, filterKategori, searchQuery])

  // Count metrics
  const stats = useMemo(() => {
    return {
      total: pengurusList.length,
      khotib: pengurusList.filter((p) => p.isKhotib && p.isActive).length,
      imam: pengurusList.filter((p) => p.isImam && p.isActive).length,
      aktif: pengurusList.filter((p) => p.isActive).length,
    }
  }, [pengurusList])

  // Handlers for Pengurus CRUD
  function openAddModal() {
    setEditingItem({
      id: `p-${Date.now()}`,
      nama: '',
      jabatan: '',
      kategori: 'BIDANG',
      tugas: '',
      telepon: '',
      foto: '',
      isKhotib: false,
      isImam: false,
      urutan: pengurusList.length + 1,
      isActive: true,
    })
    setIsModalOpen(true)
  }

  function openEditModal(item: PengurusItem) {
    setEditingItem({ ...item })
    setIsModalOpen(true)
  }

  function handleSaveModal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    if (!editingItem.nama.trim() || !editingItem.jabatan.trim()) {
      setMessage({ ok: false, text: 'Nama dan Jabatan wajib diisi' })
      return
    }

    const exists = pengurusList.some((p) => p.id === editingItem.id)
    const updated = exists
      ? pengurusList.map((p) => (p.id === editingItem.id ? editingItem : p))
      : [...pengurusList, editingItem]

    const sorted = updated.sort((a, b) => a.urutan - b.urutan)

    startTransition(async () => {
      const res = await savePengurusAction(sorted)
      if (res.ok) {
        setPengurusList(sorted)
        setIsModalOpen(false)
        setMessage({ ok: true, text: `Data pengurus "${editingItem.nama}" berhasil disimpan` })
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menyimpan pengurus' })
      }
    })
  }

  function handleDelete(item: PengurusItem) {
    if (!confirm(`Hapus pengurus "${item.nama}" (${item.jabatan})?`)) return

    const updated = pengurusList.filter((p) => p.id !== item.id)
    startTransition(async () => {
      const res = await savePengurusAction(updated)
      if (res.ok) {
        setPengurusList(updated)
        setMessage({ ok: true, text: `Pengurus "${item.nama}" telah dihapus` })
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menghapus pengurus' })
      }
    })
  }

  function handleMove(index: number, direction: 'UP' | 'DOWN') {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredPengurus.length) return

    const next = [...pengurusList]
    const itemA = filteredPengurus[index]
    const itemB = filteredPengurus[targetIndex]

    const idxA = next.findIndex((p) => p.id === itemA.id)
    const idxB = next.findIndex((p) => p.id === itemB.id)

    if (idxA === -1 || idxB === -1) return

    const tempUrutan = next[idxA].urutan
    next[idxA].urutan = next[idxB].urutan
    next[idxB].urutan = tempUrutan

    const sorted = next.sort((a, b) => a.urutan - b.urutan)
    startTransition(async () => {
      const res = await savePengurusAction(sorted)
      if (res.ok) {
        setPengurusList(sorted)
      }
    })
  }

  function handleResetDefault() {
    if (
      !confirm(
        'Kembalikan struktur pengurus ke daftar standar DKM Masjid An-nuur? Perubahan saat ini akan ditimpa.',
      )
    )
      return

    startTransition(async () => {
      const res = await resetPengurusAction()
      if (res.ok && res.data) {
        setPengurusList(res.data)
        setMessage({ ok: true, text: 'Struktur pengurus berhasil dikembalikan ke standar DKM.' })
      }
    })
  }

  // Khotib Generator Handlers
  function handlePopulateKhotibFromPengurus() {
    const khotibs = pengurusList
      .filter((p) => p.isKhotib && p.isActive)
      .map((p) => p.nama)
    if (khotibs.length === 0) {
      alert('Belum ada pengurus yang ditandai sebagai Khotib. Tandai checkbox "Khotib" pada data pengurus terlebih dahulu.')
      return
    }
    setGenKhotibInput(khotibs.join('\n'))
  }

  function handlePopulateImamFromPengurus() {
    const imams = pengurusList
      .filter((p) => p.isImam && p.isActive)
      .map((p) => p.nama)
    if (imams.length === 0) {
      alert('Belum ada pengurus yang ditandai sebagai Imam. Tandai checkbox "Imam" pada data pengurus terlebih dahulu.')
      return
    }
    setGenImamInput(imams.join('\n'))
  }

  function handleGeneratePreview() {
    const khotibList = genKhotibInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const imamList = genImamInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    if (khotibList.length === 0) {
      setMessage({ ok: false, text: 'Harap masukkan minimal 1 nama Khotib untuk rotasi' })
      return
    }

    try {
      const rows = generateJumatSchedule({
        startDate: genStartDate,
        countWeeks: genWeeks,
        khotibList,
        imamList,
      })
      setGeneratedPreview(rows)
      setMessage({
        ok: true,
        text: `Berhasil men-generate jadwal untuk ${rows.length} pekan Jumat. Tinjau jadwal di bawah dan klik "Terapkan ke Frontend".`,
      })
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Gagal men-generate jadwal',
      })
    }
  }

  function handleApplyGeneratedSchedule() {
    if (generatedPreview.length === 0) {
      setMessage({ ok: false, text: 'Generate jadwal terlebih dahulu sebelum menerapkan.' })
      return
    }

    startTransition(async () => {
      const res = await saveManualKhotibScheduleAction(generatedPreview)
      if (res.ok && res.data) {
        setJadwalJumat(res.data)
        setMessage({
          ok: true,
          text: `🎉 Jadwal ${res.data.length} Khotib Jumat berhasil disimpan dan LIVE di halaman depan website!`,
        })
        setActiveTab('jadwal')
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menerapkan jadwal ke frontend' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/admin/pengaturan" className="hover:underline">
              Pengaturan
            </Link>
            <span>/</span>
            <span className="text-neutral-800 font-medium">Pengurus &amp; Khotib</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Pengelolaan Pengurus &amp; Khotib Jumat
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Atur struktur DKM, tugas dan posisi pengurus, serta auto-generate jadwal Khotib Jumat untuk website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <span>+</span>
            <span>Tambah Pengurus</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition"
          >
            <span>⚡</span>
            <span>Auto Generate Khotib</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {message && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-sm font-medium ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <p>{message.text}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total Pengurus DKM
          </p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{stats.total}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{stats.aktif} pengurus aktif</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Petugas Khotib Jumat
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.khotib}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Siap rotasi khutbah</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Petugas Imam Sholat
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.imam}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Siap memimpin sholat</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Jadwal Khotib Frontend
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{jadwalJumat.length}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Pekan terjadwal live</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-neutral-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('pengurus')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 transition ${
            activeTab === 'pengurus'
              ? 'border-emerald-800 text-emerald-800 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>👥</span>
          <span>Daftar Pengurus DKM ({pengurusList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 transition ${
            activeTab === 'generator'
              ? 'border-emerald-800 text-emerald-800 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>⚡</span>
          <span>Auto Generate Khotib</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 transition ${
            activeTab === 'jadwal'
              ? 'border-emerald-800 text-emerald-800 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>📅</span>
          <span>Jadwal Khotib Terpasang ({jadwalJumat.length})</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PENGURUS */}
      {activeTab === 'pengurus' && (
        <div className="space-y-4">
          {/* Controls Filter & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">Filter Kategori:</span>
              <button
                type="button"
                onClick={() => setFilterKategori('ALL')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filterKategori === 'ALL'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Semua ({pengurusList.length})
              </button>
              {(Object.keys(KATEGORI_LABELS) as PengurusKategori[]).map((kat) => (
                <button
                  key={kat}
                  type="button"
                  onClick={() => setFilterKategori(kat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    filterKategori === kat
                      ? 'bg-emerald-800 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {KATEGORI_LABELS[kat]} (
                  {pengurusList.filter((p) => p.kategori === kat).length})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama, jabatan, tugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-green-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleResetDefault}
                title="Reset ke struktur standar DKM"
                className="text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1.5 underline"
              >
                Reset Default
              </button>
            </div>
          </div>

          {/* Pengurus Cards Table / Grid */}
          {filteredPengurus.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
              <p className="text-neutral-500">Tidak ada pengurus yang cocok dengan kriteria pencarian.</p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
              >
                + Tambah Pengurus Baru
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPengurus.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                    !item.isActive
                      ? 'border-neutral-200 opacity-60 bg-neutral-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <div>
                    {/* Header Card: Avatar & Name */}
                    <div className="flex items-start gap-3.5">
                      {item.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.foto}
                          alt={item.nama}
                          className="h-12 w-12 shrink-0 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 text-sm">
                          {item.nama
                            .split(' ')
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                            {KATEGORI_LABELS[item.kategori] || item.kategori}
                          </span>
                          {!item.isActive && (
                            <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-bold text-neutral-900 truncate" title={item.nama}>
                          {item.nama}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-800 truncate" title={item.jabatan}>
                          {item.jabatan}
                        </p>
                      </div>
                    </div>

                    {/* Duty & Responsibility */}
                    <div className="mt-3.5 rounded-lg bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
                      <p className="font-semibold text-neutral-900 mb-0.5">Tugas &amp; Tanggung Jawab:</p>
                      <p className="line-clamp-3" title={item.tugas}>
                        {item.tugas || 'Belum ada rincian tugas spesifik.'}
                      </p>
                    </div>

                    {/* Roles Badges (Khotib, Imam, WA) */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {item.isKhotib && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                          <span>🕌</span> Khotib Jumat
                        </span>
                      )}
                      {item.isImam && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                          <span>📖</span> Imam Sholat
                        </span>
                      )}
                      {item.telepon && (
                        <a
                          href={`https://wa.me/${item.telepon.replace(/\D/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                        >
                          <span>💬</span> {item.telepon}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Bottom */}
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'UP')}
                        disabled={index === 0}
                        title="Pindah ke Atas"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'DOWN')}
                        disabled={index === filteredPengurus.length - 1}
                        title="Pindah ke Bawah"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <span className="text-[11px] text-neutral-400 ml-1">#{item.urutan}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUTO GENERATOR KHOTIB JUMAT */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-xl text-white">
                ⚡
              </span>
              <div>
                <h2 className="text-lg font-bold text-emerald-950">
                  Generator Jadwal Khotib &amp; Imam Otomatis
                </h2>
                <p className="mt-1 text-sm text-emerald-900/80 leading-relaxed">
                  Fitur ini secara otomatis menghitung tanggal-tanggal hari Jumat yang akan datang dan
                  merotasi giliran Khotib dan Imam secara adil berdasarkan daftar pengurus DKM atau ustadz pilihan.
                  Jadwal yang di-generate langsung tampil di halaman depan website masjid.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form Generator Inputs */}
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
              <h3 className="font-bold text-neutral-900 border-b pb-3">
                1. Parameter Jadwal Jumat
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Mulai Dari Tanggal</label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Otomatis disesuaikan ke hari Jumat terdekat berikutnya.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Rentang Waktu / Jumlah Pekan</label>
                  <select
                    value={genWeeks}
                    onChange={(e) => setGenWeeks(Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value={4}>4 Pekan (1 Bulan)</option>
                    <option value={8}>8 Pekan (2 Bulan)</option>
                    <option value={12}>12 Pekan (1 Kuartal / 3 Bulan)</option>
                    <option value={24}>24 Pekan (Semester / 6 Bulan)</option>
                    <option value={52}>52 Pekan (1 Tahun Penuh)</option>
                  </select>
                </div>
              </div>

              {/* Khotib Pool Input */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>
                    Daftar Nama Khotib (1 nama per baris)
                  </label>
                  <button
                    type="button"
                    onClick={handlePopulateKhotibFromPengurus}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    ↻ Tarik dari Pengurus Khotib ({stats.khotib})
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={genKhotibInput}
                  onChange={(e) => setGenKhotibInput(e.target.value)}
                  placeholder="Ust. Fulan, Lc.&#10;Ust. Ahmad Subagio, M.Pd."
                  className={`${inputClass} font-mono text-xs`}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Nama-nama di atas akan digilir secara berurutan tiap pekan Jumat.
                </p>
              </div>

              {/* Imam Pool Input */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>
                    Daftar Nama Imam (1 nama per baris, opsional)
                  </label>
                  <button
                    type="button"
                    onClick={handlePopulateImamFromPengurus}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    ↻ Tarik dari Pengurus Imam ({stats.imam})
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={genImamInput}
                  onChange={(e) => setGenImamInput(e.target.value)}
                  placeholder="Ust. Abdul Ghofur, Lc.&#10;Syahrul Ramadhan"
                  className={`${inputClass} font-mono text-xs`}
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  className="w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Generate Jadwal Khotib Sekarang</span>
                </button>
              </div>
            </div>

            {/* Generated Preview & Publish */}
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-neutral-900">
                  2. Pratinjau Jadwal Khotib Tergenerate ({generatedPreview.length})
                </h3>
                {generatedPreview.length > 0 && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    Siap Dipublikasi
                  </span>
                )}
              </div>

              {generatedPreview.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
                  <p>Klik tombol <strong>&ldquo;Generate Jadwal Khotib Sekarang&rdquo;</strong> di sebelah kiri untuk melihat simulasi tanggal dan petugas rotasi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[380px] overflow-y-auto rounded-lg border border-neutral-200">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-neutral-100 text-neutral-700">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Pekan</th>
                          <th className="px-3 py-2 font-semibold">Tanggal Jumat</th>
                          <th className="px-3 py-2 font-semibold">Khotib</th>
                          <th className="px-3 py-2 font-semibold">Imam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {generatedPreview.map((row, idx) => {
                          const dateObj = new Date(`${row.tanggal}T00:00:00`)
                          const dateStr = !Number.isNaN(dateObj.getTime())
                            ? formatDateID(dateObj)
                            : row.tanggal

                          return (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="px-3 py-2 font-medium text-neutral-500">
                                #{idx + 1}
                              </td>
                              <td className="px-3 py-2 font-bold text-emerald-900">
                                {dateStr}
                              </td>
                              <td className="px-3 py-2 font-medium text-neutral-800">
                                <input
                                  type="text"
                                  value={row.khatib}
                                  onChange={(e) => {
                                    const next = [...generatedPreview]
                                    next[idx].khatib = e.target.value
                                    setGeneratedPreview(next)
                                  }}
                                  className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 text-neutral-600">
                                <input
                                  type="text"
                                  value={row.imam}
                                  onChange={(e) => {
                                    const next = [...generatedPreview]
                                    next[idx].imam = e.target.value
                                    setGeneratedPreview(next)
                                  }}
                                  className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleApplyGeneratedSchedule}
                    className="w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    <span>Terapkan ke Website Frontend</span>
                  </button>
                  <p className="text-center text-[11px] text-neutral-500">
                    Menyimpan ke Section Jadwal Jumat &amp; memperbarui tampilan beranda secara otomatis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: JADWAL AKTIF DI FRONTEND */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Jadwal Khotib Jumat yang Aktif di Frontend ({jadwalJumat.length} Pekan)
              </h2>
              <p className="text-xs text-neutral-500">
                Jadwal di bawah ini adalah data yang saat ini ditayangkan di section Khotib Jumat beranda.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                ⚡ Buat Jadwal Baru
              </button>
              <Link
                href="/admin/sections"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Buka Editor Sections
              </Link>
            </div>
          </div>

          {jadwalJumat.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
              <p>Belum ada jadwal Khotib Jumat yang terpasang.</p>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="mt-3 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
              >
                ⚡ Auto Generate Sekarang
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {jadwalJumat.map((item, index) => {
                const dateObj = new Date(`${item.tanggal}T00:00:00`)
                const dateStr = !Number.isNaN(dateObj.getTime())
                  ? formatDateID(dateObj)
                  : item.tanggal

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-800">
                      <span>Jumat #{index + 1}</span>
                      <span className="text-neutral-400 font-mono text-[11px]">{item.tanggal}</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-neutral-900">{dateStr}</p>

                    <dl className="mt-3 space-y-1 text-xs">
                      <div>
                        <dt className="text-neutral-500">Khotib:</dt>
                        <dd className="font-semibold text-emerald-950">{item.khatib}</dd>
                      </div>
                      {item.imam && (
                        <div>
                          <dt className="text-neutral-500">Imam:</dt>
                          <dd className="text-neutral-800">{item.imam}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT PENGURUS */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {pengurusList.some((p) => p.id === editingItem.id)
                  ? 'Edit Data Pengurus'
                  : 'Tambah Pengurus DKM Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.nama}
                    placeholder="Contoh: H. Ahmad Subagio, M.Pd."
                    onChange={(e) => setEditingItem({ ...editingItem, nama: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Posisi / Jabatan *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.jabatan}
                    placeholder="Contoh: Ketua DKM / Bendahara"
                    onChange={(e) => setEditingItem({ ...editingItem, jabatan: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Kategori Struktur</label>
                  <select
                    value={editingItem.kategori}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        kategori: e.target.value as PengurusKategori,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="PENASEHAT">Dewan Penasehat &amp; Pembina</option>
                    <option value="PIMPINAN">Pengurus Inti / Pimpinan</option>
                    <option value="BIDANG">Ketua &amp; Koordinator Bidang</option>
                    <option value="OPERASIONAL">Pelaksana Operasional &amp; Marbot</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={editingItem.telepon ?? ''}
                    placeholder="08123456789"
                    onChange={(e) => setEditingItem({ ...editingItem, telepon: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Tugas &amp; Tanggung Jawab *</label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.tugas}
                  placeholder="Jelaskan peran pokok dan wewenang pengurus ini di DKM..."
                  onChange={(e) => setEditingItem({ ...editingItem, tugas: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Upload Foto Avatar */}
              <div>
                <label className={labelClass}>Foto Profil / Avatar</label>
                <ImageField
                  value={editingItem.foto ?? ''}
                  onChange={(url) => setEditingItem({ ...editingItem, foto: url })}
                  prefix="pengurus"
                  label="Unggah Foto Pengurus"
                />
              </div>

              {/* Checkboxes: Khotib & Imam Status */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-2">
                <span className="text-xs font-semibold text-neutral-700 block mb-1">
                  Penugasan Ibadah Sholat Jumat:
                </span>
                <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingItem.isKhotib)}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isKhotib: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-green-800 focus:ring-green-800"
                  />
                  <span>
                    <strong>Khotib Jumat:</strong> Bersedia / Ditugaskan mengisi khutbah Jumat
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingItem.isImam)}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isImam: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-green-800 focus:ring-green-800"
                  />
                  <span>
                    <strong>Imam Sholat:</strong> Bersedia / Ditugaskan memimpin sholat berjamaah
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Urutan Tampilan</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.urutan}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, urutan: Number(e.target.value) || 1 })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isActive}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, isActive: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-neutral-300 text-green-800 focus:ring-green-800"
                    />
                    <span>Pengurus Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
