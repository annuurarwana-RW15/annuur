import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  donationCreateMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    donation: { create: h.donationCreateMock },
    category: { findUnique: h.categoryFindUniqueMock },
  },
}))

import { POST } from '@/app/api/donasi/route'
import { resetRateLimits } from '@/lib/rate-limit'

function donasiRequest(body: unknown, ip = '203.0.113.10', raw?: string) {
  return new Request('http://localhost/api/donasi', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: raw ?? JSON.stringify(body),
  })
}

const VALID_PAYLOAD = {
  donorName: 'Ahmad Fauzi',
  amount: 150000,
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.donationCreateMock.mockImplementation(
    async (args: { data: { reference: string } }) => ({
      id: 'd-1',
      status: 'MENUNGGU',
      ...args.data,
    }),
  )
})

describe('POST /api/donasi', () => {
  it('payload tidak valid → 400 dengan pesan per field (zod issues)', async () => {
    const res = await POST(donasiRequest({ donorName: 'A', amount: -5 }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(typeof body.error).toBe('string')
    expect(body.fields.donorName).toBeTruthy()
    expect(body.fields.amount).toBeTruthy()
    expect(h.donationCreateMock).not.toHaveBeenCalled()
  })

  it('body bukan JSON → 400', async () => {
    const res = await POST(donasiRequest(undefined, '203.0.113.10', 'bukan-json'))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(h.donationCreateMock).not.toHaveBeenCalled()
  })

  it('message > 500 karakter → 400 dengan fields.message', async () => {
    const res = await POST(
      donasiRequest({ ...VALID_PAYLOAD, message: 'x'.repeat(501) }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.fields.message).toMatch(/500/)
  })

  it('proofImage bukan http(s) → 400 dengan fields.proofImage', async () => {
    const res = await POST(
      donasiRequest({ ...VALID_PAYLOAD, proofImage: 'javascript:alert(1)' }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.fields.proofImage).toBeTruthy()
  })

  it('proofImage > 2048 karakter → 400 dengan fields.proofImage', async () => {
    const longUrl = `https://pub-acct123.r2.dev/donations/${'a'.repeat(3000)}.jpg`

    const res = await POST(donasiRequest({ ...VALID_PAYLOAD, proofImage: longUrl }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.fields.proofImage).toMatch(/panjang/)
    expect(h.donationCreateMock).not.toHaveBeenCalled()
  })

  it('valid → 200 dengan reference format DON-XXXXXXXX dan status MENUNGGU', async () => {
    const res = await POST(
      donasiRequest({
        ...VALID_PAYLOAD,
        message: 'Semoga berkah',
        proofImage: 'https://pub-acct123.r2.dev/donations/1-bukti.jpg',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.reference).toMatch(/^DON-[A-Z0-9]{8}$/)
    expect(h.donationCreateMock).toHaveBeenCalledTimes(1)
    expect(h.donationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        donorName: 'Ahmad Fauzi',
        amount: 150000,
        status: 'MENUNGGU',
        reference: body.reference,
        message: 'Semoga berkah',
        proofImage: 'https://pub-acct123.r2.dev/donations/1-bukti.jpg',
      }),
    })
  })

  it('reference antar donasi berbeda', async () => {
    const a = await POST(donasiRequest(VALID_PAYLOAD))
    const b = await POST(donasiRequest(VALID_PAYLOAD))

    expect((await a.json()).reference).not.toBe((await b.json()).reference)
  })

  it('categoryId valid (MASUK & aktif) diteruskan ke create', async () => {
    h.categoryFindUniqueMock.mockResolvedValue({
      id: 'cat-1',
      type: 'MASUK',
      isActive: true,
    })

    const res = await POST(donasiRequest({ ...VALID_PAYLOAD, categoryId: 'cat-1' }))

    expect(res.status).toBe(200)
    expect(h.categoryFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
    })
    expect(h.donationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ categoryId: 'cat-1' }),
    })
  })

  it.each([
    ['tidak ditemukan', null],
    ['bukan type MASUK', { id: 'c', type: 'KELUAR', isActive: true }],
    ['nonaktif', { id: 'c', type: 'MASUK', isActive: false }],
  ])('categoryId %s → 400 tanpa create', async (_label, category) => {
    h.categoryFindUniqueMock.mockResolvedValue(category)

    const res = await POST(donasiRequest({ ...VALID_PAYLOAD, categoryId: 'c' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.fields.categoryId).toBeTruthy()
    expect(h.donationCreateMock).not.toHaveBeenCalled()
  })

  it('request ke-6 dalam 1 menit → 429 (kuota 5/menit/IP)', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const res = await POST(donasiRequest(VALID_PAYLOAD))
      expect(res.status).toBe(200)
    }

    const blocked = await POST(donasiRequest(VALID_PAYLOAD))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({
      ok: false,
      error: 'Terlalu banyak permintaan, coba lagi nanti',
    })
    expect(h.donationCreateMock).toHaveBeenCalledTimes(5)
  })

  it('rate-limit per IP: IP lain tidak terdampak', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await POST(donasiRequest(VALID_PAYLOAD))
    }
    const blocked = await POST(donasiRequest(VALID_PAYLOAD))
    expect(blocked.status).toBe(429)

    const otherIp = await POST(donasiRequest(VALID_PAYLOAD, '198.51.100.7'))
    expect(otherIp.status).toBe(200)
  })

  it('limit dicek sebelum baca body: malformed JSON pada request ke-6 → 429', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const res = await POST(donasiRequest(VALID_PAYLOAD))
      expect(res.status).toBe(200)
    }

    const blocked = await POST(
      donasiRequest(undefined, '203.0.113.10', '{"donorName": "Ahmad'),
    )
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({
      ok: false,
      error: 'Terlalu banyak permintaan, coba lagi nanti',
    })
  })

  it('malformed JSON request pertama dalam window → 400 (bukan 429)', async () => {
    const res = await POST(
      donasiRequest(undefined, '203.0.113.11', '{"donorName": "Ahmad'),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'Body tidak valid' })
  })

  it('bentrok unique reference (P2002) → retry dan sukses', async () => {
    h.donationCreateMock
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['reference'] } })
      .mockImplementation(async (args: { data: { reference: string } }) => ({
        id: 'd-2',
        status: 'MENUNGGU',
        ...args.data,
      }))

    const res = await POST(donasiRequest(VALID_PAYLOAD))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.reference).toMatch(/^DON-[A-Z0-9]{8}$/)
    expect(h.donationCreateMock).toHaveBeenCalledTimes(2)
  })

  it('P2002 berturut-turut → 500 generik', async () => {
    h.donationCreateMock.mockRejectedValue({ code: 'P2002' })

    const res = await POST(donasiRequest(VALID_PAYLOAD))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ ok: false, error: 'Gagal menyimpan donasi' })
    expect(h.donationCreateMock).toHaveBeenCalledTimes(3)
  })

  it('error database lain → 500 generik + console.error', async () => {
    h.donationCreateMock.mockRejectedValue(new Error('db down'))

    const res = await POST(donasiRequest(VALID_PAYLOAD))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ ok: false, error: 'Gagal menyimpan donasi' })
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[donasi]'),
      expect.stringContaining('db down'),
    )
  })

  it('categoryId lookup gagal (db error) → 500 generik', async () => {
    h.categoryFindUniqueMock.mockRejectedValue(new Error('db down'))

    const res = await POST(donasiRequest({ ...VALID_PAYLOAD, categoryId: 'c' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ ok: false, error: 'Gagal menyimpan donasi' })
  })
})
