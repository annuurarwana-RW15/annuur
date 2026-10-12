import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Markdown, parseMarkdown, renderInline } from '@/components/public/Markdown'

afterEach(cleanup)

describe('parseMarkdown', () => {
  it('memisah paragraf, heading, dan bullet', () => {
    const blocks = parseMarkdown(
      ['Paragraf satu.', '', '## Judul Bagian', '', '- butir A', '- butir B', '', 'Paragraf dua.'].join(
        '\n',
      ),
    )

    expect(blocks).toEqual([
      { type: 'paragraph', text: 'Paragraf satu.' },
      { type: 'heading', level: 2, text: 'Judul Bagian' },
      { type: 'list', items: ['butir A', 'butir B'] },
      { type: 'paragraph', text: 'Paragraf dua.' },
    ])
  })

  it('heading # dan ## sama-sama jadi h2; ### jadi h3 (h1 milik judul halaman)', () => {
    const blocks = parseMarkdown('# Judul\n### Sub Judul')

    expect(blocks[0]).toEqual({ type: 'heading', level: 2, text: 'Judul' })
    expect(blocks[1]).toEqual({ type: 'heading', level: 3, text: 'Sub Judul' })
  })

  it('baris *miring* di awal tidak dianggap bullet', () => {
    const blocks = parseMarkdown('*teks miring* diteruskan')

    expect(blocks).toEqual([{ type: 'paragraph', text: '*teks miring* diteruskan' }])
  })

  it('baris kosong berapa pun hanya satu pemisah', () => {
    expect(parseMarkdown('a\n\n\n\nb')).toEqual([
      { type: 'paragraph', text: 'a' },
      { type: 'paragraph', text: 'b' },
    ])
  })
})

describe('renderInline', () => {
  it('**tebal** jadi <strong>, *miring* jadi <em>', () => {
    expect(renderInline('awal **tebal** dan *miring* akhir')).toEqual([
      'awal ',
      expect.objectContaining({
        type: 'strong',
        props: expect.objectContaining({ children: 'tebal' }),
      }),
      ' dan ',
      expect.objectContaining({
        type: 'em',
        props: expect.objectContaining({ children: 'miring' }),
      }),
      ' akhir',
    ])
  })
})

describe('Markdown', () => {
  it('render elemen tanpa dangerouslySetInnerHTML — HTML mentah tampil sebagai teks', () => {
    const { container } = render(
      <Markdown text={'## Judul\n\nIsi dengan <script>alert(1)</script>\n\n- satu\n- **dua**'} />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Judul')
    expect(container.querySelector('p')?.textContent).toBe('Isi dengan <script>alert(1)</script>')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByText('dua').tagName).toBe('STRONG')
  })
})
