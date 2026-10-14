"use client"

import { useCallback, useEffect, useState } from 'react'
import type { Section } from '@prisma/client'
import { nextPrayer, todayKey } from '@/lib/praytime'
import { SectionHeading } from './SectionHeading'

const PRAYER_NAMES = ['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']

type PrayerTimes = Record<
  'imsak' | 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya',
  string
>

interface ScheduleResponse {
  ok: boolean
  city?: string
  date?: string
  times?: PrayerTimes
  error?: string
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function PrayerSchedule({ section }: { section?: Section }) {
  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [nextInfo, setNextInfo] = useState<{ name: string; at: Date } | null>(
    null
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/praytime')
      const data = (await res.json()) as ScheduleResponse
      if (!data.ok || !data.times) {
        throw new Error(data.error || 'Gagal mengambil jadwal')
      }
      setTimes(data.times)
      setCity(data.city || '')
      setDate(data.date || '')
    } catch (e: unknown) {
      setTimes(null)
      setError(e instanceof Error ? e.message : 'Gagal mengambil jadwal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!times) return
    const tick = () => {
      const now = new Date()
      const next = nextPrayer(times, now)
      setNextInfo(next)
      setRemaining(Math.max(0, Math.floor((next.at.getTime() - now.getTime()) / 1000)))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [times])

  const countdownDisplay =
    remaining === null
      ? ''
      : `${pad(Math.floor(remaining / 3600))}:${pad(
          Math.floor((remaining % 3600) / 60)
        )}:${pad(remaining % 60)}`

  const isToday = date !== '' && date === todayKey()

  return (
    <section id="jadwal" aria-labelledby="jadwal-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="jadwal-judul">
          {section?.title || 'Jadwal Sholat'}
        </SectionHeading>
        <p className="text-hijau-tua/75 mb-6">
          {city ? `Kota: ${city}` : 'Jadwal sholat harian'}
          {isToday && (
            <span className="ms-2 inline-block rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-600">
              Hari ini
            </span>
          )}
        </p>

        <div className="rounded-2xl border border-emas/25 bg-white p-6 shadow-sm sm:p-8">
          {loading && (
            <p className="py-6 text-center text-hijau-tua/75">
              Memuat jadwal sholat...
            </p>
          )}
          {error && (
            <div className="py-6 text-center">
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-3 rounded border border-emas/25 px-4 py-2 text-sm text-emas-tua transition hover:bg-emas/10"
              >
                Coba lagi
              </button>
            </div>
          )}
          {!loading && !error && !times && (
            <p className="py-6 text-center text-hijau-tua/75">
              Jadwal sholat tidak tersedia
            </p>
          )}

          {times && (
            <>
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {PRAYER_NAMES.map((name) => {
                  const time =
                    times[name.toLowerCase() as keyof PrayerTimes] || '—'
                  return (
                    <li
                      key={name}
                      className="rounded-xl border border-emas/25 bg-krem px-4 py-3 text-center"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                        {name}
                      </p>
                      <p className="mt-1 font-display text-2xl font-bold text-hijau">
                        {time}
                      </p>
                    </li>
                  )
                })}
              </ul>

              {nextInfo && (
                <div className="mt-6 rounded-2xl border border-emas/20 bg-krem p-4">
                  <p className="mb-2 text-sm text-emas-tua">
                    Berikutnya: {nextInfo.name}
                  </p>
                  <p className="font-display text-xl font-bold text-hijau">
                    {countdownDisplay || '00:00:00'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
