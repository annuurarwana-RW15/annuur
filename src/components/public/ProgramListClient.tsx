'use client'

import { useMemo, useState } from 'react'
import type { ProgramCategory, ProgramPeriodType } from '@prisma/client'
import { ProgramCard, type ProgramWithRelations } from './ProgramCard'

interface ProgramListClientProps {
  initialPrograms: ProgramWithRelations[]
}

type PeriodTab = 'ALL' | 'PENDEK' | 'PANJANG' | 'SELESAI'

export function ProgramListClient({ initialPrograms }: ProgramListClientProps) {
  const [periodTab, setPeriodTab] = useState<PeriodTab>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<ProgramCategory | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const filteredPrograms = useMemo(() => {
    return initialPrograms.filter((prog) => {
      // Period / Selesai tab filter
      if (periodTab === 'SELESAI') {
        if (prog.status !== 'SELESAI' && prog.progress !== 100) return false
      } else if (periodTab === 'PENDEK' || periodTab === 'PANJANG') {
        if (prog.periodType !== periodTab) return false
      }

      // Category filter
      if (categoryFilter !== 'ALL' && prog.category !== categoryFilter) {
        return false
      }

      // Search term
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchTitle = prog.title.toLowerCase().includes(query)
        const matchDesc = prog.description.toLowerCase().includes(query)
        const matchPic = (prog.picName || '').toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchPic) return false
      }

      return true
    })
  }, [initialPrograms, periodTab, categoryFilter, search])

  return (
    <div className="space-y-6">
      {/* Controls Container */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-emas/20 md:flex-row md:items-center md:justify-between">
        {/* Period Filter Tabs */}
        <div className="flex overflow-x-auto p-1 bg-slate-100 rounded-xl max-w-full no-scrollbar">
          {(
            [
              { id: 'ALL', label: 'Semua Program' },
              { id: 'PENDEK', label: 'Jangka Pendek' },
              { id: 'PANJANG', label: 'Jangka Panjang' },
              { id: 'SELESAI', label: 'Selesai' },
            ] as const
          ).map((tab) => {
            const active = periodTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodTab(tab.id)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-hijau text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-hijau focus:outline-hidden"
          >
            <option value="ALL">Semua Bidang</option>
            <option value="IMARAH">Imarah (Kemakmuran)</option>
            <option value="RIAYAH">Riayah (Sarana/Fisik)</option>
            <option value="IDARAH">Idarah (Manajemen)</option>
            <option value="SOSIAL">Sosial (Pelayanan Umat)</option>
          </select>

          <div className="relative min-w-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari program kerja..."
              className="w-full sm:w-48 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-hijau focus:outline-hidden"
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
      </div>

      {/* Program Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-700">Tidak ada program yang sesuai kriteria.</p>
          <p className="mt-1 text-xs text-slate-500">
            Coba ubah kata kunci pencarian atau ganti filter tab yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  )
}
