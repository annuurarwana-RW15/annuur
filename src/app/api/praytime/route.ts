import { PraytimeError, getPrayerTimes, todayKey } from '@/lib/praytime'
import { getSetting } from '@/lib/settings'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
  const city = rawCity || settingCity || 'Jakarta'
  const date = rawDate && DAY_RE.test(rawDate) ? rawDate : todayKey()

  try {
    const times = await getPrayerTimes(city, date)
    return json({ ok: true, city, date, times })
  } catch (error) {
    const isCityNotFound =
      error instanceof PraytimeError && error.kind === 'city_not_found'
    const message =
      error instanceof Error ? error.message : 'Gagal mengambil jadwal sholat'
    return json({ ok: false, error: message }, isCityNotFound ? 404 : 503)
  }
}
