import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, getSignedUrlMock, s3SendMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
  s3SendMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
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

import { POST as uploadPost } from '@/app/api/upload/route'
import { publicUrl, r2Key } from '@/lib/r2'

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

function sessionMock() {
  authMock.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } })
}

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setR2Env()
  sessionMock()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getSignedUrlMock.mockImplementation(
    async (_client: unknown, command: { input: { Key: string } }) =>
      `https://signed.example/${command.input.Key}?sig=abc`,
  )
})

const MAX_SIZE = 5 * 1024 * 1024

describe('POST /api/upload', () => {
  it('returns 401 tanpa session', async () => {
    authMock.mockResolvedValue(null)

    const res = await uploadPost(
      jsonRequest({ filename: 'foto.jpg', contentType: 'image/jpeg' }),
    )

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Tidak terautentikasi' })
  })

  it('returns 400 untuk contentType di luar jpg/png/webp', async () => {
    const res = await uploadPost(
      jsonRequest({ filename: 'dokumen.pdf', contentType: 'application/pdf' }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Tipe file tidak diizinkan' })
  })

  it('returns 400 jika ekstensi tidak cocok dengan contentType', async () => {
    const res = await uploadPost(
      jsonRequest({
        filename: 'foto.png',
        contentType: 'image/jpeg',
        size: 1024,
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/ekstensi/i)
  })

  it('returns 400 jika nama file habis tersanitasi', async () => {
    const res = await uploadPost(
      jsonRequest({ filename: '   .jpg', contentType: 'image/jpeg', size: 1024 }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Nama file tidak valid' })
  })

  it('returns 400 bila size melebihi 5MB', async () => {
    const res = await uploadPost(
      jsonRequest({
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
        size: MAX_SIZE + 1,
      }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Ukuran file maksimal 5MB' })
  })

  it.each([
    ['tidak dikirim', undefined],
    ['bukan number', 'besar'],
    ['nol', 0],
    ['negatif', -5],
  ])('returns 400 bila size %s', async (_label, size) => {
    const res = await uploadPost(
      jsonRequest({ filename: 'foto.jpg', contentType: 'image/jpeg', size }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Ukuran file tidak valid' })
  })

  it.each(['../x', 'UPPER', 'a/../../b', 'a b', 'a//b'])(
    'returns 400 untuk prefix tidak valid: %s',
    async (prefix) => {
      const res = await uploadPost(
        jsonRequest({
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
          size: 1024,
          prefix,
        }),
      )

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Prefix tidak valid' })
    },
  )

  it('returns 200 dengan uploadUrl, key, dan publicUrl', async () => {
    const res = await uploadPost(
      jsonRequest({
        filename: 'Foto Masjid.jpg',
        contentType: 'image/jpeg',
        size: 2048,
        prefix: 'berita',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toMatch(/^berita\/\d+-[0-9a-f]{4}-foto-masjid\.jpg$/)
    expect(body.uploadUrl).toBe(`https://signed.example/${body.key}?sig=abc`)
    expect(body.publicUrl).toBe(`https://pub-acct123.r2.dev/${body.key}`)
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'masjid-bucket',
          Key: body.key,
          ContentType: 'image/jpeg',
        }),
      }),
      expect.objectContaining({ expiresIn: 600 }),
    )
  })

  it('menerima prefix nested yang valid', async () => {
    const res = await uploadPost(
      jsonRequest({
        filename: 'a.png',
        contentType: 'image/png',
        size: 100,
        prefix: 'articles/2026',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toMatch(/^articles\/2026\/\d+-[0-9a-f]{4}-a\.png$/)
  })

  it('uses R2_PUBLIC_BASE_URL for publicUrl when set', async () => {
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.an-nur.or.id/'

    const res = await uploadPost(
      jsonRequest({
        filename: 'a.png',
        contentType: 'image/png',
        size: 100,
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.publicUrl).toBe(`https://cdn.an-nur.or.id/${body.key}`)
  })

  it('fallback lokal ketika env R2 tidak dikonfigurasi — kontrak tetap sama', async () => {
    clearR2Env()

    const res = await uploadPost(
      jsonRequest({
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.local).toBe(true)
    expect(body.key).toMatch(/^uploads\/\d+-[0-9a-f]{4}-foto\.jpg$/)
    expect(body.uploadUrl).toBe(
      `/api/upload-local?scope=admin&key=${encodeURIComponent(body.key)}`,
    )
    expect(body.publicUrl).toBe(`/uploads/${body.key}`)
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('r2Key', () => {
  it('menyusun prefix + timestamp + suffix acak + nama sanitasi', () => {
    const key = r2Key('berita', 'Foto Syiar Ramadhan.JPG')
    expect(key).toMatch(/^berita\/\d+-[0-9a-f]{4}-foto-syiar-ramadhan\.jpg$/)
  })

  it('menghasilkan suffix berbeda antar panggilan (anti-collision)', () => {
    const a = r2Key('berita', 'sama.jpg')
    const b = r2Key('berita', 'sama.jpg')
    expect(a).not.toBe(b)
  })

  it('menghapus spasi & karakter tak aman, lowercase', () => {
    const key = r2Key('pengumuman', 'Iftar & Buka Puasa #2 (VIP).png')
    expect(key).toMatch(
      /^pengumuman\/\d+-[0-9a-f]{4}-iftar-buka-puasa-2-vip\.png$/,
    )
  })

  it('menghasilkan timestamp meski nama habis tersanitasi', () => {
    const key = r2Key('x', '!!!')
    expect(key).toMatch(/^x\/\d+-[0-9a-f]{4}-$/)
  })
})

describe('publicUrl', () => {
  it('fallback ke pub-<accountId>.r2.dev', () => {
    expect(publicUrl('berita/a.jpg')).toBe(
      'https://pub-acct123.r2.dev/berita/a.jpg',
    )
  })

  it('melempar error deskriptif tanpa env', () => {
    clearR2Env()
    expect(() => publicUrl('a.jpg')).toThrow(/R2 belum dikonfigurasi/)
  })
})
