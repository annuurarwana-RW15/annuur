import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { isEmptyHtml, isRichHtml, markdownToHtml } from '@/lib/article-html'
import { sanitizeArticleHtml } from '@/lib/sanitize-content'
import { Markdown } from '@/components/public/Markdown'

afterEach(cleanup)

describe('isRichHtml', () => {
  it('mendeteksi blok HTML kaya dari editor', () => {
    expect(isRichHtml('<p>Halo</p>')).toBe(true)
    expect(isRichHtml('<h2>Judul</h2>')).toBe(true)
    expect(isRichHtml('<ul><li>a</li></ul>')).toBe(true)
    expect(isRichHtml('<blockquote>kutipan</blockquote>')).toBe(true)
    expect(isRichHtml('<img src="https://cdn.example.com/a.png" alt="i">')).toBe(true)
    expect(isRichHtml('\n  <p>berawal spasi</p>')).toBe(true)
  })

  it('markdown mini / teks biasa TIDAK dianggap HTML', () => {
    expect(isRichHtml('')).toBe(false)
    expect(isRichHtml('## Judul\n\nIsi paragraf')).toBe(false)
    expect(isRichHtml('- butir satu\n- butir dua')).toBe(false)
    expect(isRichHtml('teks dengan <b>tag</b> di tengah')).toBe(false)
    expect(isRichHtml('<script>alert(1)</script>')).toBe(false)
  })
})

describe('markdownToHtml', () => {
  it('heading # dan ## → h2; ### dan lebih → h3 (identik parser lama)', () => {
    expect(markdownToHtml('# Judul')).toBe('<h2>Judul</h2>')
    expect(markdownToHtml('## Judul Bagian')).toBe('<h2>Judul Bagian</h2>')
    expect(markdownToHtml('### Sub')).toBe('<h3>Sub</h3>')
    expect(markdownToHtml('#### Empat')).toBe('<h3>Empat</h3>')
  })

  it('struktur paragraf, heading, dan bullet list identik parser lama', () => {
    const input = [
      'Paragraf satu.',
      '',
      '## Judul Bagian',
      '',
      '- butir A',
      '- butir B',
      '',
      'Paragraf dua.',
    ].join('\n')

    expect(markdownToHtml(input)).toBe(
      [
        '<p>Paragraf satu.</p>',
        '<h2>Judul Bagian</h2>',
        '<ul><li>butir A</li><li>butir B</li></ul>',
        '<p>Paragraf dua.</p>',
      ].join('\n'),
    )
  })

  it('inline **tebal** → strong dan *miring* → em (semantik sama renderInline)', () => {
    expect(markdownToHtml('awal **tebal** dan *miring* akhir')).toBe(
      '<p>awal <strong>tebal</strong> dan <em>miring</em> akhir</p>',
    )
    // baris berawal *…* bukan bullet (part.length>2 dijaga persis parser lama)
    expect(markdownToHtml('*teks miring* diteruskan')).toBe(
      '<p><em>teks miring</em> diteruskan</p>',
    )
  })

  it('tautan [teks](https://…) → anchor; skema non-http tidak dikonversi', () => {
    expect(markdownToHtml('Baca [pengumuman](https://example.com/a?x=1&y=2)')).toBe(
      '<p>Baca <a href="https://example.com/a?x=1&amp;y=2">pengumuman</a></p>',
    )
    expect(markdownToHtml('[jahat](javascript:alert(1))')).toBe(
      '<p>[jahat](javascript:alert(1))</p>',
    )
  })

  it('men-escape teks mentah agar tidak ada injeksi HTML', () => {
    expect(markdownToHtml('Aman <script>alert(1)</script> & "kutip"')).toBe(
      '<p>Aman &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;kutip&quot;</p>',
    )
    expect(markdownToHtml('**<b>** tebal')).toBe('<p><strong>&lt;b&gt;</strong> tebal</p>')
  })

  it('baris dalam satu paragraf digabung spasi; input kosong → string kosong', () => {
    expect(markdownToHtml('baris satu\nbaris dua')).toBe('<p>baris satu baris dua</p>')
    expect(markdownToHtml('')).toBe('')
  })
})

describe('isEmptyHtml', () => {
  it('body editor kosong tetap dianggap kosong untuk validasi simpan', () => {
    expect(isEmptyHtml('')).toBe(true)
    expect(isEmptyHtml('<p></p>')).toBe(true)
    expect(isEmptyHtml('<p> </p>')).toBe(true)
    expect(isEmptyHtml('<p><br></p>')).toBe(true)
    expect(isEmptyHtml('<p>isi artikel</p>')).toBe(false)
  })
})

describe('sanitizeArticleHtml', () => {
  it('membuang <script> beserta isinya', () => {
    const out = sanitizeArticleHtml('<p>aman</p><script>alert("x")</script>')
    expect(out).toContain('<p>aman</p>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert')
  })

  it('mempertahankan img (src+alt) tapi membuang atribut event handler', () => {
    const out = sanitizeArticleHtml(
      '<img src="https://cdn.example.com/a.png" alt="Foto" onerror="alert(1)">',
    )
    expect(out).toContain('src="https://cdn.example.com/a.png"')
    expect(out).toContain('alt="Foto"')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert')
  })

  it('membuang href javascript: tetapi mempertahankan teks tautan', () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">klik</a>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('klik')
  })

  it('struktur artikel utuh: p, strong, list, kutipan, hr, gambar relatif', () => {
    const out = sanitizeArticleHtml(
      '<p>Hi <strong>x</strong></p><ul><li>a</li></ul><blockquote>q</blockquote><hr><img src="/uploads/a.png" alt="i">',
    )
    expect(out).toContain('<p>Hi <strong>x</strong></p>')
    expect(out).toContain('<ul><li>a</li></ul>')
    expect(out).toContain('<blockquote>q</blockquote>')
    expect(out).toContain('<hr')
    expect(out).toContain('src="/uploads/a.png"')
  })

  it('mempertahankan text-align; membuang style lain & atribut class', () => {
    const out = sanitizeArticleHtml(
      '<h2 style="text-align: center">Judul</h2><p style="color: red; text-align: right">x</p><p class="evil">y</p>',
    )
    // serialize-html menormalkan spasi ("text-align:center"), jadi cocokkan longgar.
    expect(out).toMatch(/text-align:\s*center/)
    expect(out).toMatch(/text-align:\s*right/)
    expect(out).not.toContain('color')
    expect(out).not.toContain('evil')
  })

  it('membuang tag berbahaya: iframe, form, input, style; data: URL ditolak', () => {
    const out = sanitizeArticleHtml(
      '<div><iframe src="https://evil.example"></iframe><form action="/x"><input name="p"></form><style>p{color:red}</style>Teks</div><img src="data:image/svg+xml;base64,AAAA" alt="d">',
    )
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('<form')
    expect(out).not.toContain('<input')
    expect(out).not.toContain('<style')
    expect(out).not.toContain('color:red')
    expect(out).not.toContain('data:')
    expect(out).toContain('Teks')
  })

  it('target="_blank" otomatis diberi rel noopener', () => {
    const out = sanitizeArticleHtml('<a href="https://x.com" target="_blank">buka</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })
})

describe('Markdown (dual render)', () => {
  it('body HTML kaya dirender sebagai elemen tersanitasi, bukan teks', () => {
    const html =
      '<h2 style="text-align: center">Judul</h2><p>Isi <strong>penting</strong> <img src="https://cdn.example.com/a.png" alt="Foto" onerror="alert(1)"></p>'
    const { container } = render(<Markdown text={html} />)

    expect(container.querySelector('.article-body')).not.toBeNull()
    const heading = container.querySelector('h2')
    expect(heading).toHaveTextContent('Judul')
    expect(heading?.getAttribute('style')).toContain('text-align')
    expect(container.querySelector('strong')).toHaveTextContent('penting')
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/a.png')
    expect(img?.getAttribute('alt')).toBe('Foto')
    expect(img?.hasAttribute('onerror')).toBe(false)
  })

  it('<script> dalam body HTML dibuang saat render publik', () => {
    const { container } = render(<Markdown text={'<p>aman<script>alert(1)</script></p>'} />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('p')).toHaveTextContent('aman')
    expect(container.textContent).not.toContain('alert(1)')
  })

  it('konten markdown lama tetap lewat parser lama (tanpa .article-body)', () => {
    const { container } = render(<Markdown text={'## Judul\n\nIsi **tebal**'} />)

    expect(container.querySelector('.article-body')).toBeNull()
    expect(container.querySelector('h2')).toHaveTextContent('Judul')
    expect(container.querySelector('strong')).toHaveTextContent('tebal')
  })
})
