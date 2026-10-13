import { NextResponse } from 'next/server'
import { hit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/rate-limit'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateOk = hit(`track:${ip}`, 100, 60_000)
  if (!rateOk) {
    return new NextResponse(
      JSON.stringify({ error: 'Terlalu banyak request' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let path: string | undefined
  let referrer: string | undefined

  try {
    const body = await request.json()
    path = body.path
    referrer = body.referrer

    if (path === undefined || path === null) {
      path = ''
    }

    await db.track.create({
      data: {
        path: String(path),
        referrer: referrer ? String(referrer) : undefined,
      },
    })
  } catch (error) {
    console.error('Track error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new NextResponse(null, { status: 204 })
}