import type { ReactNode } from 'react'
import { isRichHtml } from '@/lib/article-html'
import { sanitizeArticleHtml } from '@/lib/sanitize-content'

export type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'blockquote'; text: string }

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const BULLET_RE = /^[-*+]\s+(.*)$/
const BLOCKQUOTE_RE = /^>\s*(.*)$/

/**
 * Parser markdown ringkas: paragraf, heading (`#`–`######`), bullet (`-`/`*`), blockquote (`>`).
 * Heading `#`/`##` → h2 (h1 dipakai judul halaman), `###`+ → h3.
 * Tidak ada HTML: hasilnya hanya struktur data untuk dirender sebagai elemen React.
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let quote: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list })
      list = []
    }
  }
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: 'blockquote', text: quote.join(' ') })
      quote = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      flushList()
      flushQuote()
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      flushQuote()
      blocks.push({
        type: 'heading',
        level: heading[1].length >= 3 ? 3 : 2,
        text: heading[2].trim(),
      })
      continue
    }

    const blockquote = BLOCKQUOTE_RE.exec(line)
    if (blockquote) {
      flushParagraph()
      flushList()
      quote.push(blockquote[1].trim())
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      flushParagraph()
      flushQuote()
      list.push(bullet[1].trim())
      continue
    }

    flushList()
    flushQuote()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  flushQuote()
  return blocks
}

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g

/** `**tebal**` dan `*miring*` — sisanya teks biasa, tanpa HTML injection. */
export function renderInline(text: string): ReactNode[] {
  return text
    .split(INLINE_RE)
    .filter((part) => part !== '')
    .map((part, index) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-hijau">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        )
      }
      return part
    })
}

export function Markdown({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  // Body HTML kaya (dari editor) → sanitasi allowlist lalu render sebagai HTML.
  // Komponen ini hanya dipakai server component (berita/[slug]) sehingga
  // sanitize + dangerouslySetInnerHTML aman dari XSS.
  if (isRichHtml(text)) {
    return (
      <div
        className={`article-body ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(text) }}
      />
    )
  }

  const blocks = parseMarkdown(text)

  return (
    <div className={`space-y-4 text-[17px] leading-relaxed text-hijau-tua/90 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const headingClass =
            'font-display font-bold text-hijau pt-4 text-2xl leading-snug'
          return block.level === 2 ? (
            <h2 key={index} className={headingClass}>
              {renderInline(block.text)}
            </h2>
          ) : (
            <h3 key={index} className={`${headingClass} text-xl`}>
              {renderInline(block.text)}
            </h3>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 marker:text-emas">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={index}
              className="my-4 rounded-r-2xl border-l-4 border-emas bg-white/70 p-4 sm:p-5 shadow-xs text-hijau-tua leading-relaxed italic"
            >
              {renderInline(block.text)}
            </blockquote>
          )
        }
        return <p key={index}>{renderInline(block.text)}</p>
      })}
    </div>
  )
}
