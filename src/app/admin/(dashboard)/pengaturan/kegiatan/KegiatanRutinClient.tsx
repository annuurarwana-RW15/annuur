'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  type KegiatanRutinItem,
  type HariKegiatan,
  type KategoriKegiatanRutin,
  HARI_LABELS,
  KATEGORI_KEGIATAN_LABELS,
} from '@/lib/kegiatan-rutin'
import {
  saveKegiatanRutinAction,
  resetKegiatanRutinAction,
} from './actions'

interface Props {
  initialList: KegiatanRutinItem[]
}

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-800 focus:outline-none focus:ring-1 focus:ring-green-800'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1'

export function KegiatanRutinClient({ initialList }: Props) {
  const [items, setItems] = useState<KegiatanRutinItem[]>(initialList)
  const [filterHari, setFilterHari] = useState<string>('ALL')
  const [filterKategori, setFilterKategori] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [editingItem, setEditingItem] = useState<KegiatanRutinItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchHari = filterHari === 'ALL' || item.hari === filterHari
      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori
      const matchSearch =
        searchQuery === '' ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pemateri.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())
      return matchHari && matchKategori && matchSearch
    })
  }, [items, filterHari, filterKategori, searchQuery])

  // Stats KPI
  const stats = useMemo(() => {
    return {
      total: items.length,
      aktif: items.filter((i) => i.isActive).length,
      kajianUmum: items.filter((i) => i.kategori === 'KAJIAN_UMUM' && i.isActive).length,
      muslimah: items.filter((i) => i.kategori === 'MUSLIMAH' && i.isActive).length,
      tpq: items.filter((i) => i.kategori === 'ANAK_TPQ' && i.isActive).length,
    }
  }, [items])

  function openAddModal() {
    setEditingItem({
      id: `kr-${Date.now()}`,
      nama: '',
      hari: 'AHAD',
      waktu: '',
      pemateri: '',
      kategori: 'KAJIAN_UMUM',
      lokasi: 'Ruang Sholat Utama',
      deskripsi: '',
      urutan: items.length + 1,
      isActive: true,
    })
    setIsModalOpen(true)
  }

  function openEditModal(item: KegiatanRutinItem) {
    setEditingItem({ ...item })
    setIsModalOpen(true)
  }

  function handleSaveModal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    if (!editingItem.nama.trim() || !editingItem.waktu.trim()) {
      setMessage({ ok: false, text: 'Nama Kegiatan dan Waktu wajib diisi' })
      return
    }

    const exists = items.some((i) => i.id === editingItem.id)
    const updated = exists
      ? items.map((i) => (i.id === editingItem.id ? editingItem : i))
      : [...items, editingItem]

    const sorted = updated.sort((a, b) => a.urutan - b.urutan)

    startTransition(async () => {
      const res = await saveKegiatanRutinAction(sorted)
      if (res.ok) {
        setItems(sorted)
        setIsModalOpen(false)
        setMessage({ ok: true, text: `Kegiatan rutin "${editingItem.nama}" berhasil disimpan` })
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menyimpan kegiatan rutin' })
      }
    })
  }

  function handleDelete(item: KegiatanRutinItem) {
    if (!confirm(`Hapus kegiatan rutin "${item.nama}"?`)) return

    const updated = items.filter((i) => i.id !== item.id)
    startTransition(async () => {
      const res = await saveKegiatanRutinAction(updated)
      if (res.ok) {
        setItems(updated)
        setMessage({ ok: true, text: `Kegiatan "${item.nama}" telah dihapus` })
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menghapus kegiatan rutin' })
      }
    })
  }

  function handleMove(index: number, direction: 'UP' | 'DOWN') {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredItems.length) return

    const next = [...items]
    const itemA = filteredItems[index]
    const itemB = filteredItems[targetIndex]

    const idxA = next.findIndex((i) => i.id === itemA.id)
    const idxB = next.findIndex((i) => i.id === itemB.id)

    if (idxA === -1 || idxB === -1) return

    const tempUrutan = next[idxA].urutan
    next[idxA].urutan = next[idxB].urutan
    next[idxB].urutan = tempUrutan

    const sorted = next.sort((a, b) => a.urutan - b.urutan)
    startTransition(async () => {
      const res = await saveKegiatanRutinAction(sorted)
      if (res.ok) {
        setItems(sorted)
      }
    })
  }

  function handleResetDefault() {
    if (
      !confirm(
        'Kembalikan daftar kegiatan rutin ke daftar standar DKM Masjid An-nuur? Perubahan saat ini akan ditimpa.',
      )
    )
      return

    startTransition(async () => {
      const res = await resetKegiatanRutinAction()
      if (res.ok && res.data) {
        setItems(res.data)
        setMessage({ ok: true, text: 'Daftar kegiatan rutin berhasil dikembalikan ke standar DKM.' })
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
            <span className="text-neutral-800 font-medium">Kegiatan Rutin</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Pengelolaan Jadwal Kegiatan Rutin
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Atur agenda kajian mingguan, majelis taklim, TPQ, dan kegiatan rutin masjid yang tampil di beranda dan halaman kegiatan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <span>+</span>
            <span>Tambah Kegiatan Rutin</span>
          </button>
          <Link
            href="/kegiatan"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            <span>👁️</span>
            <span>Lihat di Website</span>
          </Link>
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total Agenda Rutin
          </p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{stats.total}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{stats.aktif} kegiatan aktif</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Kajian Umum / Jamaah
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.kajianUmum}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Subuh Ahad &amp; Malam Jumat</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Majelis Taklim Muslimah
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.muslimah}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Ibu-Ibu &amp; Remaja Putri</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            TPQ &amp; Anak-Anak
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{stats.tpq}</p>
          <p className="mt-0.5 text-xs text-neutral-500">Tahsin &amp; Tahfidz Harian</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Filter Hari */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-500 mr-1">Hari:</span>
            <button
              type="button"
              onClick={() => setFilterHari('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                filterHari === 'ALL'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Semua Hari
            </button>
            {(Object.keys(HARI_LABELS) as HariKegiatan[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setFilterHari(h)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  filterHari === h
                    ? 'bg-emerald-800 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {HARI_LABELS[h]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline"
          >
            Reset Contoh Bawaan
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-100 pt-3">
          {/* Filter Kategori */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-500 mr-1">Kategori:</span>
            <button
              type="button"
              onClick={() => setFilterKategori('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                filterKategori === 'ALL'
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Semua Kategori
            </button>
            {(Object.keys(KATEGORI_KEGIATAN_LABELS) as KategoriKegiatanRutin[]).map((kat) => (
              <button
                key={kat}
                type="button"
                onClick={() => setFilterKategori(kat)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  filterKategori === kat
                    ? 'bg-emerald-800 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {KATEGORI_KEGIATAN_LABELS[kat]}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari nama, pemateri, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-green-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
          <p>Tidak ada kegiatan rutin yang cocok dengan filter pencarian.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
          >
            + Tambah Kegiatan Rutin
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                !item.isActive
                  ? 'border-neutral-200 opacity-60 bg-neutral-50'
                  : 'border-neutral-200'
              }`}
            >
              <div>
                {/* Header Tag: Hari & Kategori */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {HARI_LABELS[item.hari]}
                  </span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                    {KATEGORI_KEGIATAN_LABELS[item.kategori]}
                  </span>
                </div>

                <h3 className="font-bold text-neutral-900 leading-snug text-base" title={item.nama}>
                  {item.nama}
                </h3>

                {/* Info List */}
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-neutral-700">
                    <span className="text-neutral-400 font-semibold shrink-0">⏰</span>
                    <span className="font-medium text-emerald-950">{item.waktu}</span>
                  </div>

                  {item.pemateri && (
                    <div className="flex items-start gap-1.5 text-neutral-700">
                      <span className="text-neutral-400 font-semibold shrink-0">👤</span>
                      <span className="font-semibold text-neutral-900">{item.pemateri}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 text-neutral-600">
                    <span className="text-neutral-400 font-semibold shrink-0">📍</span>
                    <span>{item.lokasi}</span>
                  </div>
                </dl>

                {item.deskripsi && (
                  <p className="mt-3 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                    {item.deskripsi}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
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
                    disabled={index === filteredItems.length - 1}
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

      {/* MODAL TAMBAH / EDIT KEGIATAN RUTIN */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {items.some((i) => i.id === editingItem.id)
                  ? 'Edit Kegiatan Rutin'
                  : 'Tambah Kegiatan Rutin Baru'}
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
              <div>
                <label className={labelClass}>Nama Kegiatan Rutin *</label>
                <input
                  type="text"
                  required
                  value={editingItem.nama}
                  placeholder="Contoh: Kajian Subuh Ahad / Majelis Taklim"
                  onChange={(e) => setEditingItem({ ...editingItem, nama: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Hari Pelaksanaan *</label>
                  <select
                    value={editingItem.hari}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        hari: e.target.value as HariKegiatan,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="AHAD">Ahad</option>
                    <option value="SENIN">Senin</option>
                    <option value="SELASA">Selasa</option>
                    <option value="RABU">Rabu</option>
                    <option value="KAMIS">Kamis</option>
                    <option value="JUMAT">Jumat</option>
                    <option value="SABTU">Sabtu</option>
                    <option value="HARIAN">Setiap Hari</option>
                    <option value="BULANAN">Bulanan</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Kategori Peserta *</label>
                  <select
                    value={editingItem.kategori}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        kategori: e.target.value as KategoriKegiatanRutin,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="KAJIAN_UMUM">Kajian Umum / Jamaah</option>
                    <option value="MUSLIMAH">Majelis Muslimah / Ibu-Ibu</option>
                    <option value="ANAK_TPQ">TPQ &amp; Anak-Anak</option>
                    <option value="REMAJA">Remaja Masjid (RISMA)</option>
                    <option value="SOSIAL">Sosial &amp; Kemasyarakatan</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Waktu / Jam Pelaksanaan *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.waktu}
                    placeholder="Contoh: Ba'da Subuh - 06:30 WIB"
                    onChange={(e) => setEditingItem({ ...editingItem, waktu: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Lokasi / Ruang *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.lokasi}
                    placeholder="Contoh: Ruang Sholat Utama"
                    onChange={(e) => setEditingItem({ ...editingItem, lokasi: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Pemateri / Pembimbing (Opsional)</label>
                <input
                  type="text"
                  value={editingItem.pemateri}
                  placeholder="Contoh: Ust. Abdul Ghofur, Lc."
                  onChange={(e) => setEditingItem({ ...editingItem, pemateri: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Deskripsi / Materi Kajian</label>
                <textarea
                  rows={3}
                  value={editingItem.deskripsi}
                  placeholder="Jelaskan ringkasan materi, kitab rujukan, atau fasilitas..."
                  onChange={(e) => setEditingItem({ ...editingItem, deskripsi: e.target.value })}
                  className={inputClass}
                />
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
                    <span>Kegiatan Aktif</span>
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
                  {isPending ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
