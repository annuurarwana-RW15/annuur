import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    article: {
      findUnique: h.findUnique,
      update: h.update,
    },
  },
}))

import { POST } from '@/app/api/articles/view/route'
import { getClientIp, hit, resetRateLimits } from '@/lib/rate-limit'

function viewRequest(slug: unknown, ip = '203.0.113.10', body?: string): Request {
  return new Request('http://localhost:3000/api/articles/view', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: body ?? JSON.stringify({ slug }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/articles/view', () => {
  it('artikel PUBLISHED → 204 dan viewCount diincrement', async () => {
    h.findUnique.mockResolvedValue({ status: 'PUBLISHED' })
    h.update.mockResolvedValue({})

    const res = await POST(viewRequest('pengajian-rutin-mingguan'))

    expect(res.status).toBe(204)
    expect(h.update).toHaveBeenCalledWith({
      where: { slug: 'pengajian-rutin-mingguan' },
      data: { viewCount: { increment: 1 } },
    })
  })

  it('artikel DRAFT → 404 tanpa update', async () => {
    h.findUnique.mockResolvedValue({ status: 'DRAFT' })

    const res = await POST(viewRequest('artikel-draf'))

    expect(res.status).toBe(404)
    expect(h.update).not.toHaveBeenCalled()
  })

  it('slug tidak valid → 400 tanpa menyentuh database', async () => {
    const res = await POST(viewRequest('<script>alert(1)</script>'))

    expect(res.status).toBe(400)
    expect(h.findUnique).not.toHaveBeenCalled()
  })

  it('body bukan JSON → 400', async () => {
    const res = await POST(viewRequest(undefined, '203.0.113.10', 'bukan-json'))

    expect(res.status).toBe(400)
    expect(h.findUnique).not.toHaveBeenCalled()
  })

  it('body > 1KB → 400 tanpa menyentuh database', async () => {
    const oversized = JSON.stringify({ slug: 'artikel-x', pad: 'a'.repeat(2048) })

    const res = await POST(viewRequest(undefined, '203.0.113.10', oversized))

    expect(res.status).toBe(400)
    expect(h.findUnique).not.toHaveBeenCalled()
    expect(h.update).not.toHaveBeenCalled()
  })

  it('request ke-31 dalam 1 menit diblokir: tetap 204 tapi TIDAK mengincrement', async () => {
    h.findUnique.mockResolvedValue({ status: 'PUBLISHED' })
    h.update.mockResolvedValue({})

    for (let i = 1; i <= 30; i += 1) {
      const res = await POST(viewRequest('artikel-x'))
      expect(res.status).toBe(204)
    }
    expect(h.update).toHaveBeenCalledTimes(30)

    const blocked = await POST(viewRequest('artikel-x'))
    expect(blocked.status).toBe(204)
    expect(h.update).toHaveBeenCalledTimes(30)
    expect(h.findUnique).toHaveBeenCalledTimes(30)

    // kuota per IP: IP lain tidak terdampak
    const otherIp = await POST(viewRequest('artikel-x', '198.51.100.7'))
    expect(otherIp.status).toBe(204)
    expect(h.update).toHaveBeenCalledTimes(31)
  })

  it('setelah window 1 menit berakhir, increment diizinkan lagi', async () => {
    vi.useFakeTimers()
    h.findUnique.mockResolvedValue({ status: 'PUBLISHED' })
    h.update.mockResolvedValue({})

    for (let i = 1; i <= 30; i += 1) {
      await POST(viewRequest('artikel-y'))
    }
    await POST(viewRequest('artikel-y'))
    expect(h.update).toHaveBeenCalledTimes(30)

    vi.advanceTimersByTime(60_001)

    const afterWindow = await POST(viewRequest('artikel-y'))
    expect(afterWindow.status).toBe(204)
    expect(h.update).toHaveBeenCalledTimes(31)
  })
})

describe('hit (rate-limit in-memory)', () => {
  it('mengizinkan sampai limit lalu menolak; window baru setelah windowMs', () => {
    expect(hit('k', 3, 60_000)).toBe(true)
    expect(hit('k', 3, 60_000)).toBe(true)
    expect(hit('k', 3, 60_000)).toBe(true)
    expect(hit('k', 3, 60_000)).toBe(false)
    expect(hit('k lain', 3, 60_000)).toBe(true)

    vi.useFakeTimers()
    vi.advanceTimersByTime(60_001)
    expect(hit('k', 3, 60_000)).toBe(true)
  })

  it('resetRateLimits mengosongkan seluruh window', () => {
    expect(hit('z', 1, 60_000)).toBe(true)
    expect(hit('z', 1, 60_000)).toBe(false)
    resetRateLimits()
    expect(hit('z', 1, 60_000)).toBe(true)
  })
})

describe('getClientIp', () => {
  function reqWith(headers: Record<string, string>): Request {
    return new Request('http://localhost', { headers })
  }

  it('utamakan x-real-ip; leftmost XFF palsu diabaikan', () => {
    const req = reqWith({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('tanpa x-real-ip: hop paling kanan XFF dipakai (bukan leftmost)', () => {
    const req = reqWith({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('x-real-ip kosong/ws jatuh ke rightmost XFF', () => {
    const req = reqWith({
      'x-real-ip': '   ',
      'x-forwarded-for': '1.2.3.4, 203.0.113.9',
    })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('XFF satu hop dipakai apa adanya', () => {
    const req = reqWith({ 'x-forwarded-for': '203.0.113.9' })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('tanpa header sama sekali → unknown', () => {
    expect(getClientIp(reqWith({}))).toBe('unknown')
  })
})
