import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  authMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: h.authMock,
}))

vi.mock('node:fs', () => ({
  promises: {
    mkdir: h.mkdirMock,
    writeFile: h.writeFileMock,
  },
}))

import { POST } from '@/app/api/upload-proposal/route'

describe('POST /api/upload-proposal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    h.mkdirMock.mockResolvedValue(undefined)
    h.writeFileMock.mockResolvedValue(undefined)
  })

  it('returns 401 when unauthenticated', async () => {
    h.authMock.mockResolvedValue(null)
    const req = new Request('http://localhost/api/upload-proposal', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when file is missing', async () => {
    const fd = new FormData()
    const req = new Request('http://localhost/api/upload-proposal', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/file tidak ditemukan/i)
  })

  it('returns 400 when file type is not PDF or Image', async () => {
    const fd = new FormData()
    const file = new File(['hello'], 'text.txt', { type: 'text/plain' })
    fd.append('file', file)

    const req = new Request('http://localhost/api/upload-proposal', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/tipe file harus pdf atau gambar/i)
  })

  it('returns 200 with public url when valid PDF uploaded', async () => {
    const fd = new FormData()
    const file = new File(['%PDF-1.5 fake content'], 'proposal-masjid.pdf', {
      type: 'application/pdf',
    })
    fd.append('file', file)

    const req = new Request('http://localhost/api/upload-proposal', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toMatch(/^\/uploads\/proposals\/.*\.pdf$/)
    expect(h.writeFileMock).toHaveBeenCalled()
  })
})
