import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJurnal } from '@/app/admin/(dashboard)/kas/laporan/actions'

const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  db: {
    period: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
  },
  buildJurnal: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({ requireRole: h.requireRole }))
vi.mock('@/lib/db', () => ({ db: h.db }))
vi.mock('@/lib/jurnal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/jurnal')>()
  return { ...actual, buildJurnal: h.buildJurnal }
})

describe('exportJurnal', () => {
  beforeEach(() => {
    h.requireRole.mockReset()
    h.requireRole.mockResolvedValue({ id: 'u1', name: 'Bendahara', role: 'BENDAHARA' })
    h.db.period.findUnique.mockReset()
    h.db.period.findUnique.mockResolvedValue({
      id: 'p1',
      name: '2026',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 11, 31),
    })
    h.db.category.findUnique.mockReset()
    h.db.category.findUnique.mockResolvedValue({ id: 'c1' })
    h.buildJurnal.mockReset()
    h.buildJurnal.mockResolvedValue({
      saldoAwal: 500_000,
      entries: [
        {
          id: 't1',
          no: 1,
          tanggal: new Date(2026, 9, 1),
          description: 'Infak',
          kategoriId: 'c1',
          kategori: 'Infak',
          jenis: 'MASUK',
          masuk: 100_000,
          keluar: 0,
          saldo: 600_000,
        },
      ],
    })
  })

  it('menolak role tanpa akses', async () => {
    h.requireRole.mockRejectedValue(new Error('Akses ditolak'))
    await expect(exportJurnal('csv', { periodId: 'p1' })).rejects.toThrow('Akses ditolak')
    expect(h.buildJurnal).not.toHaveBeenCalled()
  })

  it('periode tidak ditemukan → ok:false', async () => {
    h.db.period.findUnique.mockResolvedValue(null)
    const result = await exportJurnal('csv', { periodId: 'missing' })
    expect(result).toEqual({ ok: false, error: 'Periode tidak ditemukan' })
  })

  it('kategori tidak ditemukan → ok:false', async () => {
    h.db.category.findUnique.mockResolvedValue(null)
    const result = await exportJurnal('csv', { periodId: 'p1', filter: { categoryId: 'bad' } })
    expect(result).toEqual({ ok: false, error: 'Kategori tidak ditemukan' })
  })

  it('csv sukses: filename, mime, konten memuat saldo akhir 600000', async () => {
    const result = await exportJurnal('csv', { periodId: 'p1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('jurnal-kas-2026.csv')
    expect(result.mime).toBe('text/csv;charset=utf-8')
    expect(result.content).toContain('LAPORAN JURNAL KAS')
    expect(result.content).toContain('600000')
  })

  it('excel sukses: mime xls', async () => {
    const result = await exportJurnal('excel', { periodId: 'p1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filename).toBe('jurnal-kas-2026.xls')
    expect(result.mime).toBe('application/vnd.ms-excel')
  })

  it('filter diteruskan ke filterJournal (hanya baris cocok yang diekspor)', async () => {
    h.buildJurnal.mockResolvedValue({
      saldoAwal: 0,
      entries: [
        {
          id: 'a', no: 1, tanggal: new Date(2026, 9, 1), description: 'Infak',
          kategoriId: 'c1', kategori: 'Infak', jenis: 'MASUK', masuk: 10, keluar: 0, saldo: 10,
        },
        {
          id: 'b', no: 2, tanggal: new Date(2026, 9, 2), description: 'Sosial',
          kategoriId: 'c2', kategori: 'Sosial', jenis: 'KELUAR', masuk: 0, keluar: 5, saldo: 5,
        },
      ],
    })
    const result = await exportJurnal('csv', { periodId: 'p1', filter: { q: 'infak' } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('Infak')
    expect(result.content).not.toContain('Sosial')
  })
})
