import sanitizeHtml from 'sanitize-html'

/**
 * Sanitasi HTML artikel untuk rendering publik (bebas XSS).
 *
 * Body artikel kaya (HTML dari editor Tiptap) dirender via
 * `dangerouslySetInnerHTML`, jadi SEMUA isi disanitasi dulu dengan allowlist
 * ketat menggunakan `sanitize-html`:
 * - Tag non-konten (script, style, iframe, form, svg, …) dibuang BESERTA
 *   isinya.
 * - Atribut event handler (on*), class, dan style selain `text-align` dibuang.
 * - URL skema berbahaya (javascript:, data:, vbscript:, file:) dibuang —
 *   hanya http(s), mailto:, tel:, path relatif, dan anchor yang lolos.
 * - Tautan `target="_blank"` selalu diberi `rel="noopener noreferrer"` (anti
 *   tabnabbing).
 *
 * Allowlist disengaja hanya mencakup struktur yang dihasilkan editor.
 */

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
  'hr', 'br', 'img', 'a', 'figure', 'figcaption',
]

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  // Atribut yang boleh di semua tag dalam allowlist.
  '*': ['style'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  a: ['href', 'title', 'target', 'rel'],
  ol: ['start'],
}

// Dua level: selector tag ('*' = semua) → properti CSS → daftar regex nilai.
// (Bentuk rata salah — akan melewatkan semua deklarasi style tanpa difilter.)
const ALLOWED_STYLES: Record<string, Record<string, RegExp[]>> = {
  '*': {
    'text-align': [/^(left|center|right)$/i],
  },
}

// Skema URL yang aman untuk href/src (default sanitize-html sudah http/https/
// mailto/tel + path relatif; kita tambah eksplisit agar jelas & ada anchor).
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel']

/**
 * Tautan `target="_blank"` dipaksa punya `rel="noopener noreferrer"` agar
 * halaman tujuan tidak bisa mengakses `window.opener` (tabnabbing).
 */
function forceNoopener(tagName: string, attribs: Record<string, string>) {
  if (
    tagName === 'a' &&
    attribs.target &&
    attribs.target.toLowerCase() === '_blank'
  ) {
    return {
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }
  }
  return { tagName, attribs }
}

/**
 * Sanitasi HTML artikel sesuai allowlist. Mengembalikan HTML aman yang hanya
 * mengandung struktur konten yang diizinkan.
 */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ALLOWED_SCHEMES,
    // Path relatif (mis. /uploads/…) dan anchor (#…) diperbolehkan.
    allowProtocolRelative: false,
    transformTags: { a: forceNoopener },
  })
}
