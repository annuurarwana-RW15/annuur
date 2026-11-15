'use client'

import { useState, useMemo } from 'react'
import {
  type KegiatanRutinItem,
  type HariKegiatan,
  type KategoriKegiatanRutin,
  HARI_LABELS,
  KATEGORI_KEGIATAN_LABELS,
} from '@/lib/kegiatan-rutin'

interface Props {
  items: KegiatanRutinItem[]
}

export function KegiatanRutinView({ items }: Props) {
  const [selectedHari, setSelectedHari] = useState<string>('ALL')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')

  const activeItems = useMemo(() => items.filter((i) => i.isActive), [items])

  const filtered = useMemo(() => {
    return activeItems.filter((item) => {
      const matchHari = selectedHari === 'ALL' || item.hari === selectedHari
      const matchKat = selectedKategori === 'ALL' || item.kategori === selectedKategori
      return matchHari && matchKat
    })
  }, [activeItems, selectedHari, selectedKategori])

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <div className="rounded-2xl border border-emas/25 bg-white/90 p-5 shadow-xs space-y-4">
        {/* Filter Hari */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-hijau-tua/70 mr-1">
            Hari:
          </span>
          <button
            type="button"
            onClick={() => setSelectedHari('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedHari === 'ALL'
                ? 'bg-hijau text-emas shadow-xs'
                : 'bg-krem text-hijau-tua hover:bg-emas/20'
            }`}
          >
            Semua ({activeItems.length})
          </button>
          {(Object.keys(HARI_LABELS) as HariKegiatan[]).map((h) => {
            const count = activeItems.filter((i) => i.hari === h).length
            if (count === 0) return null
            return (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedHari(h)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedHari === h
                    ? 'bg-hijau text-emas shadow-xs'
                    : 'bg-krem text-hijau-tua hover:bg-emas/20'
                }`}
              >
                {HARI_LABELS[h]} ({count})
              </button>
            )
          })}
        </div>

        {/* Filter Kategori */}
        <div className="flex flex-wrap items-center gap-2 border-t border-emas/15 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-hijau-tua/70 mr-1">
            Kategori:
          </span>
          <button
            type="button"
            onClick={() => setSelectedKategori('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedKategori === 'ALL'
                ? 'bg-emas text-hijau-tua font-bold shadow-xs'
                : 'bg-krem text-hijau-tua hover:bg-emas/20'
            }`}
          >
            Semua Kategori
          </button>
          {(Object.keys(KATEGORI_KEGIATAN_LABELS) as KategoriKegiatanRutin[]).map((kat) => {
            const count = activeItems.filter((i) => i.kategori === kat).length
            if (count === 0) return null
            return (
              <button
                key={kat}
                type="button"
                onClick={() => setSelectedKategori(kat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedKategori === kat
                    ? 'bg-emas text-hijau-tua font-bold shadow-xs'
                    : 'bg-krem text-hijau-tua hover:bg-emas/20'
                }`}
              >
                {KATEGORI_KEGIATAN_LABELS[kat]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emas/30 bg-white p-8 text-center text-hijau-tua/70">
          <p>Tidak ada kegiatan rutin untuk filter yang dipilih.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedHari('ALL')
              setSelectedKategori('ALL')
            }}
            className="mt-3 text-xs font-semibold text-emas-tua underline"
          >
            Tampilkan Semua Kegiatan
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-6 shadow-xs transition duration-200 hover:border-emas/60 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {HARI_LABELS[item.hari]}
                  </span>
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                    {KATEGORI_KEGIATAN_LABELS[item.kategori]}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-hijau leading-snug">
                  {item.nama}
                </h3>

                <dl className="mt-4 space-y-2 text-xs text-hijau-tua/90">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base text-emas-tua font-bold">⏰</span>
                    <span className="font-bold text-emerald-950 text-sm">{item.waktu}</span>
                  </div>

                  {item.pemateri && (
                    <div className="flex items-start gap-2.5">
                      <span className="text-base text-emas-tua font-bold">👤</span>
                      <span className="font-bold text-neutral-900 text-sm">{item.pemateri}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 text-neutral-600">
                    <span className="text-base text-emas-tua font-bold">📍</span>
                    <span className="text-sm">{item.lokasi}</span>
                  </div>
                </dl>

                {item.deskripsi && (
                  <p className="mt-4 rounded-xl bg-krem/60 p-3.5 text-xs leading-relaxed text-hijau-tua/85">
                    {item.deskripsi}
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-3 text-[11px] text-hijau-tua/60 flex items-center justify-between">
                <span>Masjid An-nuur Arwana</span>
                <span className="font-semibold text-emerald-800">Terbuka Untuk Jamaah</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
