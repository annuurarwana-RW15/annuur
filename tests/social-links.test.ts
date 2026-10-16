import { describe, expect, it } from 'vitest'
import {
  normalizeSocialLinks,
  parseSocialLinks,
} from '@/app/admin/(dashboard)/sections/social-links'

describe('parseSocialLinks', () => {
  it('membaca array {label,url} (bentuk kanonik)', () => {
    const rows = parseSocialLinks(
      JSON.stringify([{ label: 'Instagram', url: 'https://ig.example/x' }]),
    )
    expect(rows).toEqual([{ label: 'Instagram', url: 'https://ig.example/x' }])
  })

  it('membaca string[] (bentuk legacy) dengan label kosong', () => {
    expect(parseSocialLinks(JSON.stringify(['https://yt.example/x']))).toEqual([
      { label: '', url: 'https://yt.example/x' },
    ])
  })

  it('JSON rusak / bukan array → []', () => {
    expect(parseSocialLinks('{oops')).toEqual([])
    expect(parseSocialLinks('"bukan array"')).toEqual([])
  })

  it('mengabaikan item rusak; baris objek kosong dipertahankan (agar tampil di editor)', () => {
    const rows = parseSocialLinks(
      JSON.stringify([null, 42, { label: '', url: '' }, { label: 'X', url: 'https://x.example' }]),
    )
    expect(rows).toEqual([
      { label: '', url: '' },
      { label: 'X', url: 'https://x.example' },
    ])
  })
})

describe('normalizeSocialLinks', () => {
  it('array valid → rows siap simpan', () => {
    const result = normalizeSocialLinks([
      { label: ' Instagram ', url: ' https://ig.example/masjid ' },
      { label: 'Website', url: '/profil' },
    ])
    expect(result).toEqual({
      ok: true,
      rows: [
        { label: 'Instagram', url: 'https://ig.example/masjid' },
        { label: 'Website', url: '/profil' },
      ],
    })
  })

  it('baris kosong-total dibuang tanpa error', () => {
    const result = normalizeSocialLinks([{ label: '', url: '' }, { label: 'IG', url: 'https://ig.example' }])
    expect(result).toEqual({ ok: true, rows: [{ label: 'IG', url: 'https://ig.example' }] })
  })

  it('menolak label/url yang setengah terisi', () => {
    expect(normalizeSocialLinks([{ label: '', url: 'https://ig.example' }])).toEqual({
      ok: false,
      error: 'baris 1: nama wajib diisi',
    })
    expect(normalizeSocialLinks([{ label: 'IG', url: '' }])).toEqual({
      ok: false,
      error: 'baris 1: URL wajib diisi',
    })
  })

  it('menolak URL tanpa skema http(s) atau path', () => {
    expect(
      normalizeSocialLinks([{ label: 'IG', url: 'instagram.com/x' }]),
    ).toEqual({
      ok: false,
      error: 'baris 1: URL tidak valid (awali http(s):// atau /…)',
    })
  })

  it('menolak non-array', () => {
    expect(normalizeSocialLinks({ label: 'IG' })).toEqual({
      ok: false,
      error: 'harus berupa array',
    })
  })
})
