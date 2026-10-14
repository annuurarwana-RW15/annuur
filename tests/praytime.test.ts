import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PraytimeError,
  clearPraytimeCache,
  getPrayerTimes,
  matchCity,
  nextPrayer,
  normalizeCity,
  todayKey,
  type CityRef,
} from '@/lib/praytime'

const KOTA_FIXTURE = {
  status: true,
  data: [
    { id: '1', kota: 'KAB. ACEH BARAT' },
    { id: '21', kota: 'KOTA BANDUNG' },
    { id: '31', kota: 'KOTA JAKARTA PUSAT' },
    { id: '32', kota: 'KAB. TANGERANG' },
  ],
}

function jadwalFixture(id: string, lokasi: string) {
  return {
    status: true,
    data: {
      id,
      lokasi,
      daerah: 'DKI Jakarta',
      jadwal: {
        imsak: '04:30',
        subuh: '05:00',
        terbit: '06:06',
        dhuha: '06:29',
        dzuhur: '13:10',
        ashar: '15:45',
        maghrib: '18:20',
        isya: '19:40',
        tanggal: '14/10/2026',
        date: '2026-10-14',
      },
    },
  }
}

function jsonBody(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getPrayerTimes (myQuran)', () => {
  beforeEach(() => {
    clearPraytimeCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearPraytimeCache()
  })

  it('parses fixture myQuran jadwal into prayer times', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/kota/semua')) return jsonBody(KOTA_FIXTURE)
      if (url.includes('/jadwal/31/2026-10-14')) {
        return jsonBody(jadwalFixture('31', 'Kota Jakarta Pusat'))
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const times = await getPrayerTimes('Jakarta', '2026-10-14')
    expect(times).toEqual({
      imsak: '04:30',
      subuh: '05:00',
      dzuhur: '13:10',
      ashar: '15:45',
      maghrib: '18:20',
      isya: '19:40',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('caches by date and city', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/kota/semua')) return jsonBody(KOTA_FIXTURE)
      return jsonBody(jadwalFixture('31', 'Kota Jakarta Pusat'))
    })
    vi.stubGlobal('fetch', fetchMock)

    await getPrayerTimes('Jakarta', '2026-10-14')
    await getPrayerTimes('jakarta', '2026-10-14')
    await getPrayerTimes('Jakarta', '2026-10-15')

    // kota(1) + jadwal 14 okt + jadwal 15 okt — jadwal tidak di-fetch ulang
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('throws city_not_found for unknown city', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonBody(KOTA_FIXTURE))
    )

    const error = await getPrayerTimes('Bandar Lampung', '2026-10-14').catch(
      (e: unknown) => e
    )
    expect(error).toBeInstanceOf(PraytimeError)
    expect((error as PraytimeError).kind).toBe('city_not_found')
  })

  it('throws upstream when myQuran is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      })
    )

    const error = await getPrayerTimes('Jakarta', '2026-10-14').catch(
      (e: unknown) => e
    )
    expect(error).toBeInstanceOf(PraytimeError)
    expect((error as PraytimeError).kind).toBe('upstream')
  })

  it('defaults to today when no date given', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/kota/semua')) return jsonBody(KOTA_FIXTURE)
      expect(url).toContain(`/jadwal/31/${todayKey()}`)
      return jsonBody(jadwalFixture('31', 'Kota Jakarta Pusat'))
    })
    vi.stubGlobal('fetch', fetchMock)

    await getPrayerTimes('Jakarta')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('matchCity / normalizeCity', () => {
  const cities: CityRef[] = [
    { id: '31', kota: 'KOTA JAKARTA PUSAT' },
    { id: '32', kota: 'KAB. TANGERANG' },
    { id: '21', kota: 'KOTA BANDUNG' },
  ]

  it('normalizes kab/kota prefixes', () => {
    expect(normalizeCity('Kab. Tangerang')).toBe('tangerang')
    expect(normalizeCity('KOTA BANDUNG')).toBe('bandung')
  })

  it('matches exact, prefix, then contains', () => {
    expect(matchCity('Jakarta', cities)?.id).toBe('31')
    expect(matchCity('Tangerang', cities)?.id).toBe('32')
    expect(matchCity('tangerang selatan', cities)?.id).toBe('32')
    expect(matchCity('Padang', cities)).toBeNull()
  })
})

describe('nextPrayer', () => {
  const jakartaTimes = {
    imsak: '04:30',
    subuh: '05:00',
    dzuhur: '13:10',
    ashar: '15:45',
    maghrib: '18:20',
    isya: '19:40',
  }

  it('returns the next prayer after current time', () => {
    const now = new Date('2026-10-27T10:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Dzuhur')
    expect(result.at.getHours()).toBe(13)
    expect(result.at.getMinutes()).toBe(10)
  })

  it('returns Ashar if after Dzuhur but before Maghrib', () => {
    const now = new Date('2026-10-27T15:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Ashar')
    expect(result.at.getHours()).toBe(15)
    expect(result.at.getMinutes()).toBe(45)
  })

  it('returns Maghrib after Ashar', () => {
    const now = new Date('2026-10-27T16:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Maghrib')
    expect(result.at.getHours()).toBe(18)
    expect(result.at.getMinutes()).toBe(20)
  })

  it('returns Isya after Maghrib', () => {
    const now = new Date('2026-10-27T19:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Isya')
    expect(result.at.getHours()).toBe(19)
    expect(result.at.getMinutes()).toBe(40)
  })

  it('returns Subuh besok if current time after Isya', () => {
    const now = new Date('2026-10-27T20:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Subuh')
    expect(result.at.getHours()).toBe(5)
    expect(result.at.getDate()).toBe(28)
  })

  it('returns Subuh besok if current time exactly at Isya', () => {
    const now = new Date('2026-10-27T19:40:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Subuh')
    expect(result.at.getHours()).toBe(5)
    expect(result.at.getDate()).toBe(28)
  })

  it('uses times.subuh for tomorrow instead of hardcoded 05:00', () => {
    const now = new Date('2026-10-27T20:00:00')
    const result = nextPrayer({ ...jakartaTimes, subuh: '04:58' }, now)
    expect(result.name).toBe('Subuh')
    expect(result.at.getHours()).toBe(4)
    expect(result.at.getMinutes()).toBe(58)
    expect(result.at.getDate()).toBe(28)
  })
})
