import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ trackCreate: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: { track: { create: h.trackCreate } },
}))

import { POST } from '@/app/api/track/route'
import { resetRateLimits } from '@/lib/rate-limit'

function trackRequest(
  body: unknown,
  ip = '203.0.113.10',
  rawBody?: string,
): Request {
  return new Request('http://localhost:3000/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: rawBody ?? JSON.stringify(body),
  })
}

function savedData(): Record<string, unknown> {
  return (h.trackCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  resetRateLimits()
  h.trackCreate.mockResolvedValue({})
})

describe('POST /api/track', () => {
  it('path & referrer valid → 204 dan baris dibuat', async () => {
    const res = await POST(trackRequest({ path: '/berita', referrer: 'https://google.com/' }))

    expect(res.status).toBe(204)
    expect(h.trackCreate).toHaveBeenCalledTimes(1)
    expect(savedData()).toEqual({
      path: '/berita',
      referrer: 'https://google.com/',
    })
  })

  it('referrer hilang → tetap 204, path saja yang disimpan', async () => {
    const res = await POST(trackRequest({ path: '/' }))

    expect(res.status).toBe(204)
    expect(savedData().path).toBe('/')
    // undefined → Prisma mengabaikan kolomnya (referrer tetap NULL).
    expect(savedData().referrer).toBeUndefined()
  })

  it('path null/undefined → disimpan sebagai string kosong (bukan null)', async () => {
    const res = await POST(trackRequest({}))

    expect(res.status).toBe(204)
    expect(savedData().path).toBe('')
    expect(savedData().referrer).toBeUndefined()
  })

  it('path non-string → di-coerce jadi string', async () => {
    const res = await POST(trackRequest({ path: 12345 }))

    expect(res.status).toBe(204)
    expect(savedData().path).toBe('12345')
  })

  it('body bukan JSON → 500 tanpa menyentuh database', async () => {
    const res = await POST(trackRequest(undefined, '203.0.113.10', 'bukan-json'))

    expect(res.status).toBe(500)
    expect(h.trackCreate).not.toHaveBeenCalled()
  })

  it('database gagal → 500', async () => {
    h.trackCreate.mockRejectedValue(new Error('koneksi putus'))

    const res = await POST(trackRequest({ path: '/x' }))

    expect(res.status).toBe(500)
  })
})

describe('POST /api/track — rate-limit 100/menit/IP', () => {
  it('request ke-101 dalam satu menit diblokir 429', async () => {
    for (let i = 1; i <= 100; i += 1) {
      const res = await POST(trackRequest({ path: `/p/${i}` }))
      expect(res.status).toBe(204)
    }
    expect(h.trackCreate).toHaveBeenCalledTimes(100)

    const blocked = await POST(trackRequest({ path: '/p/101' }))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'Terlalu banyak request' })
    expect(h.trackCreate).toHaveBeenCalledTimes(100)
  })

  it('kuota per-IP: IP lain tidak terdampak', async () => {
    for (let i = 1; i <= 100; i += 1) {
      await POST(trackRequest({ path: '/p' }, '203.0.113.10'))
    }
    expect((await POST(trackRequest({ path: '/p' }, '203.0.113.10'))).status).toBe(429)

    const other = await POST(trackRequest({ path: '/p' }, '198.51.100.7'))
    expect(other.status).toBe(204)
    expect(h.trackCreate).toHaveBeenCalledTimes(101)
  })

  it('x-real-ip dipakai sebagai kunci (bukan leftmost XFF)', async () => {
    const req = new Request('http://localhost/api/track', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.99',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
      body: JSON.stringify({ path: '/x' }),
    })
    expect((await POST(req)).status).toBe(204)

    // Kunci yang dipakai adalah 203.0.113.99 — habiskan kuotanya.
    for (let i = 1; i <= 99; i += 1) {
      await POST(trackRequest({ path: '/x' }, '9.9.9.9'))
      const real = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.99',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        },
        body: JSON.stringify({ path: '/x' }),
      })
      expect((await POST(real)).status).toBe(204)
    }

    const last = new Request('http://localhost/api/track', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.99',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
      body: JSON.stringify({ path: '/x' }),
    })
    expect((await POST(last)).status).toBe(429)

    // IP lain (hop kanan XFF 5.6.7.8) masih punya kuota.
    expect((await POST(trackRequest({ path: '/x' }, '5.6.7.8'))).status).toBe(204)
  })

  it('setelah window 60 detik berakhir, tracking diizinkan lagi', async () => {
    vi.useFakeTimers()
    for (let i = 1; i <= 100; i += 1) {
      await POST(trackRequest({ path: '/p' }))
    }
    expect((await POST(trackRequest({ path: '/p' }))).status).toBe(429)

    vi.advanceTimersByTime(60_001)

    expect((await POST(trackRequest({ path: '/p' }))).status).toBe(204)
    vi.useRealTimers()
  })
})
