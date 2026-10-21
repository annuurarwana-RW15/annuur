/**
 * Utilitas konten artikel: deteksi format (HTML kaya vs markdown mini lama),
 * konversi markdown→HTML untuk mode edit, dan pengecekan body kosong.
 *
 * Artikel lama disimpan sebagai markdown mini (## judul, **tebal**, *miring*,
 * - daftar, [teks](url)). Artikel baru disimpan sebagai HTML dari editor Tiptap.
 * Tidak ada migrasi DB: format dibedakan lewat deteksi di `isRichHtml`.
 */

// Tag blok yang dihasilkan editor — dipakai sebagai penanda "ini HTML kaya".
const BLOCK_HTML_RE =
  /^\s*<(p|h[1-6]|ul|ol|blockquote|figure|hr|pre|img)\b/i

/**
 * True bila teks adalah HTML kaya dari editor (bukan markdown mini / teks biasa).
 * Konten yang tidak berawal tag blok tetap dianggap markdown sehingga parser
 * lama dipakai untuk artikel yang belum pernah diedit di editor.
 */
export function isRichHtml(text: string): boolean {
  return BLOCK_HTML_RE.test(text)
}

// Kumpulan tag yang di-escape agar tidak ada injeksi HTML dari teks mentah.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline markdown yang didukung renderer publik lama (renderInline).
const BOLD_ITALIC_RE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g

function renderInlineMarkdown(text: string): string {
  return text
    .split(BOLD_ITALIC_RE)
    .filter((part) => part !== '')
    .map((part) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return `<em>${escapeHtml(part.slice(1, -1))}</em>`
      }
      return escapeHtml(part)
    })
    .join('')
}

// Tautan markdown [teks](https://…) → <a href> (cocok dengan output editor).
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g

function renderLinks(html: string): string {
  return html.replace(LINK_RE, (match, label: string, url: string) => {
    if (/^https?:\/\//i.test(url) || url.startsWith('/')) {
      return `<a href="${url}">${label}</a>`
    }
    return match
  })
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const BULLET_RE = /^[-*+]\s+(.*)$/

/**
 * Konversi markdown mini (format artikel lama) ke HTML setara sehingga saat
 * dibuka di editor tampil WYSIWYG. Semantik mengikuti parser markdown publik:
 * `#`/`##`→h2, `###`+→h3, bullet `-`/`*`→<ul>, **tebal**, *miring*, [teks](url).
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      const inline = renderLinks(renderInlineMarkdown(paragraph.join(' ')))
      out.push(`<p>${inline}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      const items = list
        .map((item) => `<li>${renderLinks(renderInlineMarkdown(item))}</li>`)
        .join('')
      out.push(`<ul>${items}</ul>`)
      list = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      // `#`/`##` → h2, `###`+ → h3 (konsisten dengan parser publik lama).
      const level = heading[1].length >= 3 ? 3 : 2
      const inline = renderLinks(renderInlineMarkdown(heading[2].trim()))
      out.push(`<h${level}>${inline}</h${level}>`)
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      flushParagraph()
      list.push(bullet[1].trim())
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return out.join('\n')
}

/**
 * True bila body editor dianggap kosong (hanya tag kosong / whitespace).
 * Editor menghasilkan "<p></p>" saat kosong — perlu diperlakukan kosong agar
 * validasi "isi artikel wajib diisi" tetap bekerja.
 */
export function isEmptyHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim() === ''
}
