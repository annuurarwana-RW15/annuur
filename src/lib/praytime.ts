export type PrayerTimes = Record<
  'imsak' | 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya',
  string
>

export type CityRef = { id: string; kota: string }

export type PraytimeErrorKind = 'city_not_found' | 'upstream'

export class PraytimeError extends Error {
  readonly kind: PraytimeErrorKind

  constructor(message: string, kind: PraytimeErrorKind) {
    super(message)
    this.name = 'PraytimeError'
    this.kind = kind
  }
}

const MYQURAN_BASE = 'https://api.myquran.com/v2/sholat'
const CITY_TTL_MS = 24 * 60 * 60 * 1000
const JADWAL_TTL_MS = 6 * 60 * 60 * 1000

const PRAYER_KEYS = [
  'imsak',
  'subuh',
  'dzuhur',
  'ashar',
  'maghrib',
  'isya',
] as const

type CityCache = { cities: CityRef[]; expires: number }
type JadwalCache = { times: PrayerTimes; expires: number }

let cityCache: CityCache | null = null
const jadwalCache = new Map<string, JadwalCache>()

export function clearPraytimeCache(): void {
  cityCache = null
  jadwalCache.clear()
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDayKey(date?: Date | string): string {
  if (!date) return todayKey()
  if (typeof date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return todayKey()
    return date
  }
  return todayKey(date)
}

export function normalizeCity(value: string): string {
  return value
    .toLowerCase()
    .replace(/^(kab(?:upaten)?\.?|kota|kecamatan)\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function matchCity(
  query: string,
  cities: CityRef[]
): CityRef | null {
  const q = normalizeCity(query)
  if (!q) return null
  const normalized = cities.map((c) => ({ ref: c, key: normalizeCity(c.kota) }))

  return (
    normalized.find((c) => c.key === q)?.ref ??
    normalized.find(
      (c) => c.key.startsWith(q) || q.startsWith(c.key)
    )?.ref ??
    normalized.find((c) => c.key.includes(q) || q.includes(c.key))?.ref ??
    null
  )
}

async function fetchCities(): Promise<CityRef[]> {
  if (cityCache && cityCache.expires > Date.now()) return cityCache.cities

  let res: Response
  try {
    res = await fetch(`${MYQURAN_BASE}/kota/semua`)
  } catch {
    throw new PraytimeError(
      'Layanan jadwal sholat tidak terjangkau. Coba lagi nanti.',
      'upstream'
    )
  }
  if (!res.ok) {
    throw new PraytimeError(
      'Layanan jadwal sholat tidak terjangkau. Coba lagi nanti.',
      'upstream'
    )
  }

  const body: unknown = await res.json().catch(() => null)
  const data =
    typeof body === 'object' && body !== null && 'data' in body
      ? (body as { data: unknown }).data
      : null
  const raw = Array.isArray(data) ? data : []

  const cities: CityRef[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const rec = item as Record<string, unknown>
    const id = rec.id
    const kota = rec.kota ?? rec.lokasi
    if ((typeof id === 'string' || typeof id === 'number') && typeof kota === 'string') {
      cities.push({ id: String(id), kota })
    }
  }
  if (cities.length === 0) {
    throw new PraytimeError(
      'Data kota dari layanan jadwal sholat tidak valid.',
      'upstream'
    )
  }

  cityCache = { cities, expires: Date.now() + CITY_TTL_MS }
  return cities
}

async function fetchJadwal(cityId: string, day: string): Promise<PrayerTimes> {
  const cacheKey = `${day}|${cityId}`
  const cached = jadwalCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.times

  let res: Response
  try {
    res = await fetch(`${MYQURAN_BASE}/jadwal/${encodeURIComponent(cityId)}/${day}`)
  } catch {
    throw new PraytimeError(
      'Jadwal sholat gagal diambil dari layanan myQuran.',
      'upstream'
    )
  }
  if (res.status === 404) {
    throw new PraytimeError(
      `Jadwal sholat untuk ${day} tidak tersedia.`,
      'upstream'
    )
  }
  if (!res.ok) {
    throw new PraytimeError(
      'Jadwal sholat gagal diambil dari layanan myQuran.',
      'upstream'
    )
  }

  const body: unknown = await res.json().catch(() => null)
  const jadwal =
    typeof body === 'object' && body !== null && 'data' in body
      ? (body as { data?: { jadwal?: unknown } }).data?.jadwal
      : null
  if (typeof jadwal !== 'object' || jadwal === null) {
    throw new PraytimeError(
      'Data jadwal sholat dari myQuran tidak valid.',
      'upstream'
    )
  }

  const rec = jadwal as Record<string, unknown>
  const times = {} as PrayerTimes
  for (const key of PRAYER_KEYS) {
    const value = rec[key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new PraytimeError(
        'Data jadwal sholat dari myQuran tidak lengkap.',
        'upstream'
      )
    }
    times[key] = value.trim()
  }

  jadwalCache.set(cacheKey, { times, expires: Date.now() + JADWAL_TTL_MS })
  return times
}

/**
 * Jadwal sholat dari myQuran (https://api.myquran.com) dengan cache harian.
 * `date` berupa `Date` atau string `YYYY-MM-DD` (default: hari ini).
 * Lempar `PraytimeError` bertipe `city_not_found` | `upstream`.
 */
export async function getPrayerTimes(
  city: string,
  date?: Date | string
): Promise<PrayerTimes> {
  const day = toDayKey(date)
  const query = city.trim()
  if (!query) {
    throw new PraytimeError('Kota belum ditentukan.', 'city_not_found')
  }

  const normalized = normalizeCity(query)
  const cachedKey = `${day}|${normalized}`
  const cached = jadwalCache.get(cachedKey)
  if (cached && cached.expires > Date.now()) return cached.times

  const cities = await fetchCities()
  const match = matchCity(query, cities)
  if (!match) {
    throw new PraytimeError(
      `Kota "${query}" tidak ditemukan di jadwal sholat myQuran. Ubah Kota di menu Pengaturan.`,
      'city_not_found'
    )
  }

  const times = await fetchJadwal(match.id, day)
  jadwalCache.set(cachedKey, { times, expires: Date.now() + JADWAL_TTL_MS })
  return times
}

export function nextPrayer(
  times: PrayerTimes,
  now: Date
): { name: string; at: Date } {
  const prayerOrder = [...PRAYER_KEYS]
  const prayerNames = ['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let i = 0; i < prayerOrder.length; i++) {
    const key = prayerOrder[i]
    const timeStr = times[key] || ''
    if (!timeStr) continue
    const [hourStr, minuteStr] = timeStr.split(':')
    const prayerHour = parseInt(hourStr, 10)
    const prayerMinute = parseInt(minuteStr, 10)
    if (Number.isNaN(prayerHour) || Number.isNaN(prayerMinute)) continue
    const prayerMinutes = prayerHour * 60 + prayerMinute

    if (prayerMinutes > nowMinutes) {
      const at = new Date(now)
      at.setHours(prayerHour, prayerMinute, 0, 0)
      if (at <= now) {
        at.setDate(at.getDate() + 1)
      }
      return { name: prayerNames[i], at }
    }
  }

  // Setelah Isya → Subuh besok (jam subuh hari berikutnya)
  const [hourStr, minuteStr] = (times.subuh || '05:00').split(':')
  const at = new Date(now)
  at.setDate(at.getDate() + 1)
  at.setHours(parseInt(hourStr, 10) || 0, parseInt(minuteStr, 10) || 0, 0, 0)
  return { name: 'Subuh', at }
}
