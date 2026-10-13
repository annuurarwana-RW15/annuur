"use client"

import { useState, useEffect } from 'react'
import type { Section } from '@prisma/client'
import { nextPrayer } from '@/lib/praytime'
import { SectionHeading } from './SectionHeading'

const PRAYER_NAMES = ['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']

const SUPPORTED_CITIES = ['Jakarta', 'Bandung', 'Surabaya']

type PrayerTimes = Record<'imsak' | 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya', string>

export function PrayerSchedule({ section }: { section?: Section }) {
  const [times, setTimes] = useState<PrayerTimes>({} as PrayerTimes)
  const [city, setCity] = useState('Jakarta')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{ name: string; at: Date } | null>(null)
  const [countdown, setCountdown] = useState<{ seconds: number } | null>(null)
  const [todayBadge, setTodayBadge] = useState(false)

  useEffect(() => {
    const savedCity = typeof window !== 'undefined' ? localStorage.getItem('prayerCity') : null
    const defaultCity = savedCity || 'Jakarta'
    setCity(defaultCity)
    fetchTimes(defaultCity)
  }, [])

  useEffect(() => {
    localStorage.setItem('prayerCity', city)
    fetchTimes(city)
  }, [city])

  const fetchTimes = async (cityName: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/praytime?city=${cityName}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Gagal mengambil jadwal')
      setTimes(data.times as PrayerTimes)
      setTodayBadge(Object.values(data.times as PrayerTimes).some((t: string) => t.trim() !== ''))
      const now = new Date()
      const next = nextPrayer(data.times, now)
      setNextPrayerInfo(next)
      startCountdown(next.at)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kota tidak didukung'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const startCountdown = (target: Date) => {
    const update = () => {
      const now = new Date()
      const diff = target.getTime() - now.getTime()
      if (diff <= 0) {
        setCountdown(null)
        setNextPrayerInfo({ name: 'Subuh', at: new Date(now.getTime() + 24 * 60 * 60 * 1000) })
        return
      }
      const seconds = Math.floor(diff / 1000)
      setCountdown({ seconds })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }

  useEffect(() => {
    if (Object.keys(times).length > 0) {
      const now = new Date()
      const next = nextPrayer(times, now)
      setNextPrayerInfo(next)
      startCountdown(next.at)
    }
  }, [times])

  const countdownDisplay = countdown
    ? `${countdown.seconds
        .toString()
        .padStart(2, '0')}:${(
      '0' + Math.floor(countdown.seconds % 60)
    ).padStart(2, '0')}`
    : ''

  const hasTimes = Object.keys(times).length > 0

  return (
    <section id="jadwal" aria-labelledby="jadwal-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="jadwal-judul">
          {section?.title || 'Jadwal Sholat'}
        </SectionHeading>
        <p className="text-hijau-tua/75 mb-6">Kota: {city}</p>

        <div className="rounded-2xl border border-emas/25 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <select
              value={city}
              onChange={(e) => setCity((e.target as HTMLSelectElement).value)}
              className="rounded border border-emas/25 px-4 py-2 text-sm"
            >
              {SUPPORTED_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchTimes(city)}
              className="mt-2 inline-block rounded border border-emas/25 px-4 py-2 text-sm text-emas-tua hover:bg-emas/10 transition"
              disabled={loading}
            >
              {loading ? 'Mengambil...' : 'Ambil jadwal'}
            </button>
          </div>

          {loading && <p className="py-6 text-center text-hijau-tua/75">Memuat jadwal sholat...</p>}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          {!loading && !error && !hasTimes && (
            <p className="py-6 text-center text-hijau-tua/75">
              Pilih kota untuk melihat jadwal sholat
            </p>
          )}

          {hasTimes && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {PRAYER_NAMES.map((name) => {
                  const time = times[name.toLowerCase() as keyof PrayerTimes] || '—'
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
              </div>

              {nextPrayerInfo && (
                <div className="mt-6 p-4 rounded-2xl border border-emas/20 bg-krem">
                  <p className="text-sm text-emas-tua mb-2">
                    Berikutnya: {nextPrayerInfo.name}
                  </p>
                  <p className="font-display text-xl font-bold text-hijau">
                    {countdownDisplay ? (
                      <span>{countdownDisplay}</span>
                    ) : (
                      'Wartanya'
                    )}
                  </p>
                  {todayBadge && (
                    <span className="inline-block ms-2 text-xs text-rose-500 rounded bg-rose-100 px-2 py-1">
                      Hari ini
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}