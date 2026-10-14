import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSignedUrlMock, s3SendMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(),
  s3SendMock: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = s3SendMock
  },
  PutObjectCommand: vi.fn().mockImplementation(function (
    this: unknown,
    input: unknown,
  ) {
    return { input }
  }),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}))

import { POST as uploadPublicPost } from '@/app/api/upload-public/route'
import { resetRateLimits } from '@/lib/rate-limit'

const R2_ENV = {
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'keyid',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'masjid-bucket',
}

function setR2Env() {
  for (const [k, v] of Object.entries(R2_ENV)) process.env[k] = v
  delete process.env.R2_PUBLIC_BASE_URL
}

function clearR2Env() {
  for (const k of [...Object.keys(R2_ENV), 'R2_PUBLIC_BASE_URL']) {
    delete process.env[k]
  }
}

function jsonRequest(body: unknown, ip = '203.0.113.10') {
  return new Request('http://localhost/api/upload-public', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
  setR2Env()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getSignedUrlMock.mockImplementation(
    async (_client: unknown, command: { input: { Key: string } }) =>
      `https://signed.example/${command.input.Key}?sig=abc`,
  )
})

const MAX_SIZE = 5 * 1024 * 1024

describe('POST /api/upload-public', () => {
  it('returns 400 untuk contentType di luar jpg/png/webp', async () => {
    const res = await uploadPublicPost(
      jsonRequest({ filename: 'dokumen.pdf', contentType: 'application/pdf', size: 10 }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Tipe file tidak diizinkan' })
  })

  it('returns 400 jika ekstensi tidak cocok dengan contentType', async () => {
    const res = await uploadPublicPost(
      jsonRequest({ filename: 'foto.png', contentType: 'image/jpeg', size: 1024 }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/ekstensi/i)
  })

  it.each([
    ['tidak dikirim', undefined],
    ['bukan number', 'besar'],
    ['nol', 0],
    ['negatif', -5],
  ])('returns 400 bila size %s', async (_label, size) => {
    const res = await uploadPublicPost(
      jsonRequest({ filename: 'foto.jpg', contentType: 'image/jpeg', size }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Ukuran file tidak valid' })
  })

  it('returns 400 bila size melebihi 5MB', async () => {
    const res = await uploadPublicPost(
      jsonRequest({
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
        size: MAX_SIZE + 1,
      }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Ukuran file maksimal 5MB' })
  })

  it('returns 400 jika nama file habis tersanitasi', async () => {
    const res = await uploadPublicPost(
      jsonRequest({ filename: '   .jpg', contentType: 'image/jpeg', size: 1024 }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Nama file tidak valid' })
  })

  it('returns 200 dengan key ber-prefix donations (prefix pemanggil diabaikan)', async () => {
    const res = await uploadPublicPost(
      jsonRequest({
        filename: 'Bukti Transfer.jpg',
        contentType: 'image/jpeg',
        size: 2048,
        prefix: 'berita',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toMatch(/^donations\/\d+-[0-9a-f]{4}-bukti-transfer\.jpg$/)
    expect(body.uploadUrl).toBe(`https://signed.example/${body.key}?sig=abc`)
    expect(body.publicUrl).toBe(`https://pub-acct123.r2.dev/${body.key}`)
  })

  it('request ke-6 dalam 1 menit diblokir 429 (kuota 5/menit/IP)', async () => {
    const payload = {
      filename: 'bukti.jpg',
      contentType: 'image/jpeg',
      size: 1024,
    }

    for (let i = 1; i <= 5; i += 1) {
      const res = await uploadPublicPost(jsonRequest(payload))
      expect(res.status).toBe(200)
    }

    const blocked = await uploadPublicPost(jsonRequest(payload))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'Terlalu banyak permintaan' })
  })

  it('rate-limit per IP: IP lain tidak terdampak', async () => {
    const payload = {
      filename: 'bukti.jpg',
      contentType: 'image/jpeg',
      size: 1024,
    }
    for (let i = 1; i <= 5; i += 1) {
      await uploadPublicPost(jsonRequest(payload))
    }
    const blocked = await uploadPublicPost(jsonRequest(payload))
    expect(blocked.status).toBe(429)

    const otherIp = await uploadPublicPost(jsonRequest(payload, '198.51.100.7'))
    expect(otherIp.status).toBe(200)
  })

  it('tanpa x-forwarded-for pun tetap dilayani (ip unknown)', async () => {
    const res = await uploadPublicPost(
      new Request('http://localhost/api/upload-public', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: 'bukti.jpg',
          contentType: 'image/jpeg',
          size: 1024,
        }),
      }),
    )

    expect(res.status).toBe(200)
  })

  it('returns error generik 500 ketika env R2 tidak dikonfigurasi', async () => {
    clearR2Env()

    const res = await uploadPublicPost(
      jsonRequest({
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      }),
    )

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Gagal membuat URL upload' })
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[upload-public]'),
      expect.stringContaining('R2 belum dikonfigurasi'),
    )
  })
})
