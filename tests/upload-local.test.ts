import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

import { PUT as uploadLocalPut } from '@/app/api/upload-local/route'
import { resetRateLimits } from '@/lib/rate-limit'

const BASE = path.join(process.cwd(), 'public', 'uploads')
const TEST_DIR = path.join(BASE, 'test-lokal')
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

function put(
  query: Record<string, string>,
  bytes: Uint8Array<ArrayBuffer> = PNG,
  contentType = 'image/png',
  ip = '203.0.113.10',
): Request {
  const headers = new Headers({ 'x-forwarded-for': ip })
  if (contentType) headers.set('content-type', contentType)
  return new Request(
    `http://localhost/api/upload-local?${new URLSearchParams(query)}`,
    { method: 'PUT', headers, body: bytes },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimits()
  authMock.mockResolvedValue({ user: { id: 'u-1', role: 'ADMIN' } })
})

afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true })
  await fs.rm(path.join(BASE, 'donations'), { recursive: true, force: true })
})

describe('PUT /api/upload-local (fallback lokal sebelum R2)', () => {
  it('scope admin tanpa session → 401 tanpa menulis file', async () => {
    authMock.mockResolvedValue(null)
    const res = await uploadLocalPut(
      put({ scope: 'admin', key: 'test-lokal/x.png' }),
    )
    expect(res.status).toBe(401)
    await expect(fs.stat(path.join(TEST_DIR, 'x.png'))).rejects.toThrow()
  })

  it('scope tidak dikenal → 400', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'lain', key: 'test-lokal/x.png' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Scope tidak valid')
  })

  it('scope admin valid → file tertulis di public/uploads/<key>', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'admin', key: 'test-lokal/foto.png' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const written = await fs.readFile(path.join(TEST_DIR, 'foto.png'))
    expect(Uint8Array.from(written).subarray(0, 8)).toEqual(
      Uint8Array.from(PNG.subarray(0, 8)),
    )
  })

  it('menolak tipe file di luar jpg/png/webp', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'admin', key: 'test-lokal/x.png' }, PNG, 'text/plain'),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Tipe file/)
    await expect(fs.stat(path.join(TEST_DIR, 'x.png'))).rejects.toThrow()
  })

  it('menolak key traversal (path keluar dari public/uploads)', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'admin', key: '../evil.png' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Key tidak valid')
  })

  it('scope public tanpa prefix donations/ → 400', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'public', key: 'test-lokal/x.png' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Prefix tidak valid')
  })

  it('scope public: 5 sukses pertama, permintaan ke-6 diblokir 429', async () => {
    const query = { scope: 'public', key: 'donations/test-lokal/bukti.png' }
    const statuses: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const res = await uploadLocalPut(put(query))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(statuses[5]).toBe(429)
  })

  it('scope public valid → file masuk folder donations/', async () => {
    const res = await uploadLocalPut(
      put({ scope: 'public', key: 'donations/bukti.png' }),
    )
    expect(res.status).toBe(200)
    await expect(
      fs.stat(path.join(BASE, 'donations', 'bukti.png')),
    ).resolves.toBeTruthy()
  })
})
