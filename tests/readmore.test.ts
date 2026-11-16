import { describe, expect, it } from 'vitest'
import { splitReadmore } from '@/lib/readmore'
import { sanitizeArticleHtml } from '@/lib/sanitize-content'

describe('splitReadmore', () => {
  it('memisahkan teks berdasarkan penanda hr data-readmore', () => {
    const input = [
      '<p>Paragraf pembuka profil masjid An-Nuur Arwana.</p>',
      '<hr data-readmore="true" class="readmore-marker" />',
      '<p>Sejarah lengkap pembangunan masjid sejak tahun 2010.</p>',
      '<p>Visi dan misi kepengurusan DKM.</p>',
    ].join('\n')

    const result = splitReadmore(input)
    expect(result.hasReadmore).toBe(true)
    expect(result.preview).toBe('<p>Paragraf pembuka profil masjid An-Nuur Arwana.</p>')
    expect(result.full).toBe(input.trim())
  })

  it('memisahkan teks berdasarkan komentar <!-- more -->', () => {
    const input = '<p>Cuplikan ringkas.</p><!-- more --><p>Kelanjutan isi.</p>'
    const result = splitReadmore(input)
    expect(result.hasReadmore).toBe(true)
    expect(result.preview).toBe('<p>Cuplikan ringkas.</p>')
    expect(result.full).toBe(input)
  })

  it('otomatis memotong 2 paragraf pertama pada HTML tanpa penanda manual', () => {
    const input = [
      '<p>Paragraf pertama.</p>',
      '<p>Paragraf kedua.</p>',
      '<p>Paragraf ketiga yang panjang.</p>',
      '<p>Paragraf keempat.</p>',
    ].join('')

    const result = splitReadmore(input)
    expect(result.hasReadmore).toBe(false)
    expect(result.preview).toBe('<p>Paragraf pertama.</p><p>Paragraf kedua.</p>')
    expect(result.full).toBe(input)
  })

  it('mengembalikan seluruh isi jika HTML memiliki <= 2 paragraf', () => {
    const input = '<p>Paragraf satu.</p><p>Paragraf dua.</p>'
    const result = splitReadmore(input)
    expect(result.hasReadmore).toBe(false)
    expect(result.preview).toBe(input)
    expect(result.full).toBe(input)
  })

  it('otomatis memotong 2 paragraf pada teks biasa / legacy format', () => {
    const input = 'Paragraf satu.\n\nParagraf dua.\n\nParagraf tiga.\n\nParagraf empat.'
    const result = splitReadmore(input)
    expect(result.hasReadmore).toBe(false)
    expect(result.preview).toBe('Paragraf satu.\n\nParagraf dua.')
    expect(result.full).toBe(input)
  })

  it('menangani input kosong dengan aman', () => {
    const result = splitReadmore('')
    expect(result.preview).toBe('')
    expect(result.full).toBe('')
    expect(result.hasReadmore).toBe(false)
  })
})

describe('sanitizeArticleHtml with readmore and text alignment', () => {
  it('mengizinkan atribut data-readmore dan class pada hr', () => {
    const input = '<hr data-readmore="true" class="readmore-marker" />'
    const sanitized = sanitizeArticleHtml(input)
    expect(sanitized).toContain('data-readmore="true"')
    expect(sanitized).toContain('class="readmore-marker"')
  })

  it('mengizinkan style text-align: justify', () => {
    const input = '<p style="text-align: justify">Paragraf rata kanan kiri.</p>'
    const sanitized = sanitizeArticleHtml(input)
    expect(sanitized).toContain('style="text-align:justify"')
  })
})
