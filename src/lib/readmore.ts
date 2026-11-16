import { isRichHtml } from './article-html'

export interface ReadmoreResult {
  /** Bagian cuplikan sebelum batas readmore (untuk beranda / kartu ringkasan). */
  preview: string
  /** Seluruh konten lengkap (untuk halaman detail / profil lengkap). */
  full: string
  /** Apakah terdapat penanda readmore eksplisit dari editor. */
  hasReadmore: boolean
}

const READMORE_REGEX = /<hr\b[^>]*\b(?:data-readmore="true"|class="[^"]*readmore-marker[^"]*")[^>]*>|<!--\s*more\s*-->/i

/**
 * Memisahkan konten teks/HTML menjadi cuplikan (preview) dan konten utuh berdasarkan
 * penanda batas readmore ("✂️ Batas Readmore").
 * Jika belum ada penanda, otomatis memotong 2 paragraf pertama atau ~400 karakter.
 */
export function splitReadmore(content: string): ReadmoreResult {
  const trimmed = (content || '').trim()
  if (!trimmed) {
    return { preview: '', full: '', hasReadmore: false }
  }

  // 1. Cek jika terdapat penanda readmore eksplisit
  const match = READMORE_REGEX.exec(trimmed)
  if (match) {
    const previewPart = trimmed.slice(0, match.index).trim()
    return {
      preview: previewPart || trimmed,
      full: trimmed,
      hasReadmore: true,
    }
  }

  // 2. Jika format HTML kaya (Rich Text) tanpa penanda manual
  if (isRichHtml(trimmed)) {
    // Ambil maksimal 2 paragraf pertama sebagai cuplikan
    const pMatches = Array.from(trimmed.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi))
    if (pMatches.length > 2) {
      const firstTwo = pMatches.slice(0, 2).map((m) => m[0]).join('')
      return {
        preview: firstTwo,
        full: trimmed,
        hasReadmore: false,
      }
    }
    return { preview: trimmed, full: trimmed, hasReadmore: false }
  }

  // 3. Jika format teks biasa / legacy markdown
  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length > 2) {
    return {
      preview: paragraphs.slice(0, 2).join('\n\n'),
      full: trimmed,
      hasReadmore: false,
    }
  }

  return { preview: trimmed, full: trimmed, hasReadmore: false }
}
