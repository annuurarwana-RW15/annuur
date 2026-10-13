import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { getSetting, setSetting } from '@/lib/settings'

vi.mock('@/lib/db', () => ({
  db: {
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const findUnique = vi.mocked(db.setting.findUnique)
const upsert = vi.mocked(db.setting.upsert)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSetting', () => {
  it('mengembalikan object/array hasil adapter apa adanya (tanpa double parse)', async () => {
    findUnique.mockResolvedValueOnce({
      key: 'kas.publicCategories',
      value: ['Infak', 'Sedekah'],
    })
    await expect(getSetting('kas.publicCategories', [])).resolves.toEqual([
      'Infak',
      'Sedekah',
    ])

    findUnique.mockResolvedValueOnce({
      key: 'donasi.rekening',
      value: { bank: 'BSI', no: '123' },
    })
    await expect(getSetting('donasi.rekening', {})).resolves.toEqual({
      bank: 'BSI',
      no: '123',
    })
  })

  it('mengembalikan nilai string sebagai string apa adanya', async () => {
    findUnique.mockResolvedValueOnce({
      key: 'site.name',
      value: 'Masjid An-nuur Arwana',
    })
    await expect(getSetting('site.name', 'fallback')).resolves.toBe(
      'Masjid An-nuur Arwana',
    )
  })

  it('menghormati Promise<T>: string berupa angka tetap kembali sebagai string', async () => {
    findUnique.mockResolvedValueOnce({ key: 'site.phone', value: '12345' })
    await expect(getSetting<string>('site.phone', '')).resolves.toBe('12345')
  })

  it('mengembalikan fallback saat row tidak ada', async () => {
    findUnique.mockResolvedValueOnce(null)
    await expect(getSetting('no.such.key', { d: 1 })).resolves.toEqual({ d: 1 })
  })

  it('mengembalikan fallback saat findUnique melempar error', async () => {
    findUnique.mockRejectedValueOnce(new Error('db down'))
    await expect(getSetting('site.name', 'fallback')).resolves.toBe('fallback')
  })
})

describe('setSetting', () => {
  it('memanggil upsert dengan key dan value', async () => {
    await setSetting('site.name', 'Baru')
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'site.name' },
      update: { value: 'Baru' },
      create: { key: 'site.name', value: 'Baru' },
    })
  })
})
