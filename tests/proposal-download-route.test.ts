import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/proposal/[slug]/download/route'

const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    proposal: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

describe('GET /api/proposal/[slug]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan 400 jika slug kosong', async () => {
    const req = new Request('http://localhost/api/proposal//download')
    const res = await GET(req, { params: Promise.resolve({ slug: '' }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/tidak valid/i)
  })

  it('mengembalikan 404 jika proposal tidak ditemukan atau tidak memiliki filePdf', async () => {
    mockFindUnique.mockResolvedValue(null)
    const req = new Request('http://localhost/api/proposal/tidak-ada/download')
    const res = await GET(req, { params: Promise.resolve({ slug: 'tidak-ada' }) })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/belum diunggah/i)
  })

  it('mengembalikan redirect jika filePdf merupakan URL eksternal', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'p1',
      title: 'Proposal Kanopi',
      filePdf: 'https://drive.google.com/file/d/123/view',
    })

    const req = new Request('http://localhost/api/proposal/proposal-kanopi/download')
    const res = await GET(req, { params: Promise.resolve({ slug: 'proposal-kanopi' }) })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://drive.google.com/file/d/123/view')
  })

  it('mengembalikan file PDF lokal dengan Content-Disposition attachment untuk didownload', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'p1',
      title: 'Pembangunan Kanopi Parkir',
      filePdf: '/uploads/proposals/proposal-kanopi-parkir.pdf',
    })

    const req = new Request('http://localhost/api/proposal/pembangunan-kanopi-parkir/download')
    const res = await GET(req, { params: Promise.resolve({ slug: 'pembangunan-kanopi-parkir' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment;')
    expect(res.headers.get('Content-Disposition')).toContain('.pdf')
  })
})
