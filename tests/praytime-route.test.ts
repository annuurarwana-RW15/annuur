import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getSettingMock: vi.fn(),
}))

vi.mock('@/lib/settings', () => ({ getSetting: h.getSettingMock }))

import { GET } from '@/app/api/praytime/route'
import { clearPraytimeCache } from '@/lib/praytime'

const KOTA_FIXTURE = {
  status: true,
  data: [
    { id: '21', kota: 'KOTA BANDUNG' },
    { id: '1210', kota: 'KAB. KARAWANG' },
  ],
}

function jadwalFixture(id: string, lokasi: string) {
  return {
    status: true,
    data: {
      id,
      lokasi,
      daerah: 'Jawa Barat',
      jadwal: {
        imsak: '04:01',
        subuh: '04:11',
        dzuhur: '11:39',
        ashar: '14:47',
        maghrib: '17:47',
        isya: '18:57',
        tanggal: '20/10/2026',
        date: '2026-10-20',
      },
    },
  }
}

function jsonBody(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function request(url = 'http://localhost/api/praytime'): Request {
  return new Request(url)
}

describe('GET /api/praytime', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    clearPraytimeCache()
    h.getSettingMock.mockResolvedValue('')
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/kota/semua')) return jsonBody(KOTA_FIXTURE)
      if (url.includes('/jadwal/21/')) {
        return jsonBody(jadwalFixture('21', 'Kota Bandung'))
      }
      if (url.includes('/jadwal/1210/')) {
        return jsonBody(jadwalFixture('1210', 'Kab. Karawang'))
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearPraytimeCache()
  })

  it('tanpa pengaturan kota → memakai default Karawang', async () => {
    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.city).toBe('Karawang')
    expect(body.times).toMatchObject({ subuh: '04:11', isya: '18:57' })
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/jadwal/1210/')
  })

  it('site.city lama yang tak ditemukan ("Arwana") → fallback ke Karawang', async () => {
    h.getSettingMock.mockResolvedValue('Arwana')

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.city).toBe('Karawang')
  })

  it('site.city valid → kota tersebut yang dipakai', async () => {
    h.getSettingMock.mockResolvedValue('Bandung')

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.city).toBe('Bandung')
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/jadwal/21/')
  })

  it('query site.city gagal dibaca dari DB → tetap default Karawang', async () => {
    h.getSettingMock.mockRejectedValue(new Error('db down'))

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.city).toBe('Karawang')
  })

  it('?city= eksplisit yang tak dikenal → 404 tanpa fallback', async () => {
    const res = await GET(request('http://localhost/api/praytime?city=Padang'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.ok).toBe(false)
    expect(typeof body.error).toBe('string')
    // hanya fetch kota yang terjadi; jadwal tidak pernah diminta
    expect(fetchMock.mock.calls.every(([input]) => !String(input).includes('/jadwal/'))).toBe(
      true,
    )
  })

  it('date tidak valid → memakai tanggal hari ini', async () => {
    const res = await GET(request('http://localhost/api/praytime?date=12-31-2026'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
