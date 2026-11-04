'use client'

import { useMemo, useState } from 'react'
import {
  getHijriMonthGrid,
  getHijriParts,
  HIJRI_MONTHS_ID,
  ISLAMIC_EVENTS,
  type HijriDayInfo,
  type IslamicEvent,
} from '@/lib/hijri'

const DAY_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function HijriCalendar() {
  const today = useMemo(() => new Date(), [])
  const currentHijri = useMemo(() => getHijriParts(today), [today])

  const [selectedYear, setSelectedYear] = useState<number>(currentHijri.year)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentHijri.month)
  const [activeTab, setActiveTab] = useState<'kalender' | 'agenda'>('kalender')

  // Hari-hari dalam bulan terpilih
  const monthDays = useMemo(() => {
    return getHijriMonthGrid(selectedYear, selectedMonth, today)
  }, [selectedYear, selectedMonth, today])

  // Rentang Masehi untuk bulan Hijriah terpilih
  const gregorianRange = useMemo(() => {
    if (monthDays.length === 0) return ''
    const first = monthDays[0].gDate
    const last = monthDays[monthDays.length - 1].gDate
    const dFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
    return `${dFmt.format(first)} – ${dFmt.format(last)} ${last.getFullYear()}`
  }, [monthDays])

  // Agenda / Hari Besar di bulan terpilih
  const eventsInMonth = useMemo<IslamicEvent[]>(() => {
    return ISLAMIC_EVENTS.filter((ev) => ev.month === selectedMonth)
  }, [selectedMonth])

  // Sel kosong awal minggu (pad sebelum hari pertama)
  const leadingBlankCount = monthDays.length > 0 ? monthDays[0].dayOfWeek : 0

  function prevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  function goToToday() {
    setSelectedYear(currentHijri.year)
    setSelectedMonth(currentHijri.month)
  }

  return (
    <div className="mt-8 rounded-2xl border border-emas/30 bg-white p-4 shadow-sm sm:p-6">
      {/* Header Kalender Hijriah */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-emas/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hijau text-krem text-sm">
              🌙
            </span>
            <h3 className="font-display text-xl font-bold text-hijau">
              Kalender Tahun Hijriah
            </h3>
            <span className="rounded-full bg-emas/20 px-2.5 py-0.5 text-xs font-semibold text-emas-tua border border-emas/40">
              {selectedYear} H
            </span>
          </div>
          <p className="mt-1 text-xs text-hijau-tua/75">
            Bulan:{' '}
            <strong className="font-semibold text-hijau">
              {HIJRI_MONTHS_ID[selectedMonth - 1]} {selectedYear} H
            </strong>{' '}
            ({gregorianRange})
          </p>
        </div>

        {/* Kontrol Navigasi Bulan */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-emas/30 bg-krem/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('kalender')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'kalender'
                  ? 'bg-hijau text-krem shadow-sm'
                  : 'text-hijau-tua hover:text-hijau'
              }`}
            >
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'agenda'
                  ? 'bg-hijau text-krem shadow-sm'
                  : 'text-hijau-tua hover:text-hijau'
              }`}
            >
              Agenda Islam {eventsInMonth.length > 0 && `(${eventsInMonth.length})`}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-hijau-tua transition hover:border-emas hover:bg-emas/10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-full border border-emas/40 bg-krem px-3 py-1 text-xs font-semibold text-emas-tua transition hover:bg-emas hover:text-hijau"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-hijau-tua transition hover:border-emas hover:bg-emas/10"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Pilih Bulan Cepat */}
      <div className="mt-3 flex overflow-x-auto gap-1 pb-2 scrollbar-thin">
        {HIJRI_MONTHS_ID.map((name, idx) => {
          const mNum = idx + 1
          const isCurrent = mNum === selectedMonth
          return (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedMonth(mNum)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                isCurrent
                  ? 'bg-emas font-bold text-hijau shadow-sm'
                  : 'border border-black/10 bg-neutral-50 text-neutral-600 hover:border-emas/50 hover:bg-krem'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      {activeTab === 'kalender' ? (
        <div className="mt-4">
          {/* Header Nama Hari */}
          <div className="grid grid-cols-7 gap-1 text-center font-display text-xs font-bold text-hijau-tua/75 border-b border-black/5 pb-2">
            {DAY_NAMES.map((day, i) => (
              <span key={day} className={i === 5 ? 'text-green-700 font-extrabold' : ''}>
                {day}
              </span>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Blank leading cells */}
            {Array.from({ length: leadingBlankCount }).map((_, i) => (
              <div
                key={`blank-${i}`}
                aria-hidden="true"
                className="h-14 sm:h-16 rounded-xl border border-transparent bg-neutral-50/40 opacity-40"
              />
            ))}

            {/* Days in Month */}
            {monthDays.map((d: HijriDayInfo) => {
              const gDayText = d.gDate.getDate().toString()
              const gMonthText = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(
                d.gDate,
              )

              return (
                <div
                  key={`day-${d.hDay}`}
                  className={`relative flex flex-col justify-between h-14 sm:h-16 rounded-xl border p-1.5 text-center transition ${
                    d.isToday
                      ? 'border-emas bg-gradient-to-br from-hijau to-hijau-tua text-krem shadow ring-2 ring-emas/80'
                      : d.isJumat
                      ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50'
                      : d.isSunnahFast
                      ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-100/50'
                      : 'border-black/10 bg-white hover:border-emas/40 hover:bg-krem/30'
                  }`}
                >
                  {/* Penanda Puasa Sunnah */}
                  <div className="flex items-center justify-between text-[9px] leading-none">
                    {d.isSunnahFast ? (
                      <span
                        className={`rounded px-1 py-0.2 font-semibold ${
                          d.isToday
                            ? 'bg-emas text-hijau'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title={d.fastType ? `Puasa ${d.fastType}` : 'Puasa Sunnah'}
                      >
                        {d.fastType === 'Ayyamul Bidh' ? 'Bidh' : d.fastType}
                      </span>
                    ) : (
                      <span />
                    )}
                    {d.isToday && (
                      <span className="font-bold uppercase tracking-wider text-[8px] text-emas-muda">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* Tanggal Hijriah Utama */}
                  <span
                    className={`font-display text-base sm:text-xl font-bold leading-none ${
                      d.isToday ? 'text-emas-muda' : 'text-neutral-900'
                    }`}
                  >
                    {d.hDay}
                  </span>

                  {/* Tanggal Masehi Pendamping */}
                  <span
                    className={`text-[10px] leading-none ${
                      d.isToday ? 'text-krem/80' : 'text-neutral-500'
                    }`}
                  >
                    {gDayText} {gMonthText}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legenda Keterangan */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3 text-xs text-neutral-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-emas bg-hijau shadow-sm ring-1 ring-emas" />
                <span>Hari Ini</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-green-300 bg-green-100" />
                <span>Hari Jumat</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
                <span>Puasa Sunnah (Senin/Kamis/Ayyamul Bidh)</span>
              </span>
            </div>

            <p className="text-[11px] text-neutral-400">
              *Metode hisab Umm al-Qura standard penanggalan Hijriah.
            </p>
          </div>
        </div>
      ) : (
        /* Tab Agenda & Hari Besar Islam */
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900">
            Agenda &amp; Momentum Islam pada Bulan {HIJRI_MONTHS_ID[selectedMonth - 1]}
          </h4>
          {eventsInMonth.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-xs text-neutral-500">
              Tidak ada peringatan hari besar khusus di bulan {HIJRI_MONTHS_ID[selectedMonth - 1]}.
              Dianjurkan rutin mengamalkan puasa sunnah Senin-Kamis dan Ayyamul Bidh (13, 14, 15).
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {eventsInMonth.map((ev) => (
                <div
                  key={ev.name}
                  className="rounded-xl border border-emas/30 bg-krem/40 p-3.5 transition hover:border-emas hover:bg-krem"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emas/20 px-2 py-0.5 text-xs font-bold text-emas-tua">
                      {ev.day} {HIJRI_MONTHS_ID[selectedMonth - 1]}
                    </span>
                    <h5 className="font-semibold text-hijau text-sm">{ev.name}</h5>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
                    {ev.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-black/5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Daftar Hari Besar Islam Tahun Ini ({selectedYear} H)
            </h5>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              {ISLAMIC_EVENTS.slice(0, 6).map((ev) => (
                <div key={ev.name} className="rounded-lg border border-black/5 bg-neutral-50 p-2.5">
                  <span className="font-bold text-hijau">
                    {ev.day} {HIJRI_MONTHS_ID[ev.month - 1]}
                  </span>
                  <p className="font-medium text-neutral-900 truncate">{ev.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

