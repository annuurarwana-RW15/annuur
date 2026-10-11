import { describe, expect, it } from 'vitest'
import {
  buildCsv,
  buildTableHref,
  getPageItems,
  getTableParams,
  PAGE_SIZES,
} from '@/lib/table-query'

describe('getTableParams', () => {
  it('default { q: "", page: 1, size: 20 }', () => {
    expect(getTableParams({})).toEqual({ q: '', page: 1, size: 20 })
    expect(getTableParams({ q: undefined, page: undefined, size: undefined })).toEqual({
      q: '',
      page: 1,
      size: 20,
    })
  })

  it('clamp page >= 1 (0, negatif, bukan angka)', () => {
    expect(getTableParams({ page: '0' }).page).toBe(1)
    expect(getTableParams({ page: '-5' }).page).toBe(1)
    expect(getTableParams({ page: 'abc' }).page).toBe(1)
    expect(getTableParams({ page: '' }).page).toBe(1)
    expect(getTableParams({ page: '3' }).page).toBe(3)
    expect(getTableParams({ page: ['7', '9'] }).page).toBe(7)
  })

  it('size harus 20 | 50 | 100, selain itu default 20', () => {
    expect(getTableParams({ size: '20' }).size).toBe(20)
    expect(getTableParams({ size: '50' }).size).toBe(50)
    expect(getTableParams({ size: '100' }).size).toBe(100)
    expect(getTableParams({ size: '13' }).size).toBe(20)
    expect(getTableParams({ size: 'x' }).size).toBe(20)
    expect(getTableParams({ size: '-50' }).size).toBe(20)
    expect(PAGE_SIZES).toEqual([20, 50, 100])
  })

  it('membaca q, sort, dir (hanya asc|desc yang valid)', () => {
    expect(getTableParams({ q: 'zakat', sort: 'date', dir: 'desc' })).toEqual({
      q: 'zakat',
      page: 1,
      size: 20,
      sort: 'date',
      dir: 'desc',
    })
    expect(getTableParams({ dir: 'sideways' }).dir).toBeUndefined()
    expect(getTableParams({ sort: '' }).sort).toBeUndefined()
  })
})

describe('buildCsv', () => {
  it('prefix BOM + pemisah ; + newline akhir', () => {
    expect(buildCsv(['A', 'B'], [[1, 2]])).toBe('\uFEFFA;B\n1;2\n')
  })

  it('angka tetap polos (tanpa pemisah ribuan/quote)', () => {
    expect(buildCsv(['Nominal'], [[1234567]])).toBe('\uFEFFNominal\n1234567\n')
  })

  it('string mengandung ; " newline di-quote RFC4180', () => {
    expect(buildCsv(['Ket'], [['a;b']])).toBe('\uFEFFKet\n"a;b"\n')
    expect(buildCsv(['Ket'], [['say "hi"']])).toBe('\uFEFFKet\n"say ""hi"""\n')
    expect(buildCsv(['Ket'], [['baris\n2']])).toBe('\uFEFFKet\n"baris\n2"\n')
  })

  it('tanpa baris data tetap punya header', () => {
    expect(buildCsv(['A', 'B'], [])).toBe('\uFEFFA;B\n')
  })
})

describe('buildTableHref', () => {
  it('menulis patch ke query string mempertahankan param lain', () => {
    const sp = new URLSearchParams('q=s&jenis=masuk&page=3')
    expect(buildTableHref('/admin/kas', sp, { page: 5 })).toBe(
      '/admin/kas?q=s&jenis=masuk&page=5',
    )
  })

  it('nilai kosong/undefined menghapus param', () => {
    const sp = new URLSearchParams('q=s&sort=nama&dir=asc')
    expect(buildTableHref('/admin/kas', sp, { sort: undefined, dir: undefined })).toBe(
      '/admin/kas?q=s',
    )
    expect(buildTableHref('/admin/kas', new URLSearchParams(), { q: '' })).toBe('/admin/kas')
  })
})

describe('getPageItems', () => {
  it('pola 1 … 4 5 6 … 20', () => {
    expect(getPageItems(5, 20)).toEqual([1, '…', 4, 5, 6, '…', 20])
  })

  it('sedikit halaman → semua nomor', () => {
    expect(getPageItems(2, 3)).toEqual([1, 2, 3])
    expect(getPageItems(1, 1)).toEqual([1])
  })

  it('dekat awal/akhir tanpa elipsis ganda', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, '…', 20])
    expect(getPageItems(20, 20)).toEqual([1, '…', 19, 20])
  })
})
