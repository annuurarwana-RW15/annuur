import { PraytimeError, getPrayerTimes, todayKey } from '@/lib/praytime'
import { getSetting } from '@/lib/settings'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Kota bawaan (Karawang, Jawa Barat) — jadwal sholat jalan tanpa seting. */
const DEFAULT_CITY = 'Karawang'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(error: unknown): Response {
  const isCityNotFound =
    error instanceof PraytimeError && error.kind === 'city_not_found'
  const message =
    error instanceof Error ? error.message : 'Gagal mengambil jadwal sholat'
  return json({ ok: false, error: message }, isCityNotFound ? 404 : 503)
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const rawCity = searchParams.get('city')?.trim()
  const rawDate = searchParams.get('date')?.trim()

  let settingCity = ''
  try {
    const value = await getSetting('site.city', '')
    if (typeof value === 'string') settingCity = value.trim()
  } catch {
    settingCity = ''
  }
  // Default Karawang (Jawa Barat) agar jadwal sholat langsung jalan tanpa
  // pengaturan — site.city di DB menimpa nilai ini bila sudah diset admin.
  const city = rawCity || settingCity || DEFAULT_CITY
  const date = rawDate && DAY_RE.test(rawDate) ? rawDate : todayKey()

  try {
    const times = await getPrayerTimes(city, date)
    return json({ ok: true, city, date, times })
  } catch (error) {
    // Kota dari pengaturan tidak ditemukan di myQuran (mis. masih nilai lama
    // seperti "Arwana") → jatuh ke kota default agar jadwal tetap tampil.
    // Query `?city=` eksplisit tidak di-fallback: permintaan spesifik yang
    // salah tetap dilayani 404 apa adanya.
    if (
      error instanceof PraytimeError &&
      error.kind === 'city_not_found' &&
      !rawCity &&
      city !== DEFAULT_CITY
    ) {
      try {
        const times = await getPrayerTimes(DEFAULT_CITY, date)
        return json({ ok: true, city: DEFAULT_CITY, date, times })
      } catch (fallbackError) {
        return errorResponse(fallbackError)
      }
    }
    return errorResponse(error)
  }
}
