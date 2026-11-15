import { NextResponse } from 'next/server'
import { hit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/rate-limit'
import { db } from '@/lib/db'

const MAX_BODY_BYTES = 2048
const MAX_PATH_LENGTH = 255
const MAX_REFERRER_LENGTH = 500

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateOk = hit(`track:${ip}`, 100, 60_000)
  if (!rateOk) {
    return new NextResponse(
      JSON.stringify({ error: 'Terlalu banyak request' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new NextResponse(
      JSON.stringify({ error: 'Payload terlalu besar' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let path: string | undefined
  let referrer: string | undefined

  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return new NextResponse(
        JSON.stringify({ error: 'Payload terlalu besar' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const body = JSON.parse(raw) as { path?: unknown; referrer?: unknown }
    const rawPath = body.path
    path =
      rawPath === undefined || rawPath === null
        ? ''
        : String(rawPath).trim().slice(0, MAX_PATH_LENGTH)
    referrer =
      typeof body.referrer === 'string'
        ? body.referrer.trim().slice(0, MAX_REFERRER_LENGTH)
        : undefined

    await db.track.create({
      data: {
        path,
        referrer: referrer || undefined,
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