import { getPrayerTimes } from '@/lib/praytime'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Jakarta'

  if (!['Jakarta', 'Bandung', 'Surabaya'].includes(city)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Kota tidak didukung' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  const times = getPrayerTimes(city)

  return new Response(
    JSON.stringify({ ok: true, times }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
}