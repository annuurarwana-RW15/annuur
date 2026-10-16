export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'whatsapp'
  | 'telegram'
  | 'website'

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  website: 'Website',
}

const HOST_PATTERNS: ReadonlyArray<readonly [SocialPlatform, RegExp]> = [
  ['instagram', /instagram\.com|instagr\.am/],
  ['facebook', /facebook\.com|fb\.com|fb\.me/],
  ['youtube', /youtube\.com|youtu\.be/],
  ['tiktok', /tiktok\.com/],
  ['x', /\/\/x\.com|\/\/www\.x\.com|\/\/twitter\.com|^x\.com|^twitter\.com/],
  ['whatsapp', /whatsapp\.com|wa\.me/],
  ['telegram', /t\.me|telegram\.(me|org)/],
]

const LABEL_PATTERNS: ReadonlyArray<readonly [SocialPlatform, RegExp]> = [
  ['instagram', /insta/],
  ['facebook', /face\s?book|\bfb\b/],
  ['youtube', /you\s?tube|\byt\b/],
  ['tiktok', /tik\s?toc/],
  ['x', /twitter|(^|\s)x(\s|$)/],
  ['whatsapp', /whats\s?app|\bwa\b/],
  ['telegram', /tele\s?gram/],
]

/** Deteksi platform dari URL (utama) lalu nama/label manual. Default: website. */
export function detectSocialPlatform(label: string, url: string): SocialPlatform {
  const urlLower = url.toLowerCase().trim()
  for (const [platform, pattern] of HOST_PATTERNS) {
    if (pattern.test(urlLower)) return platform
  }

  const labelLower = label.toLowerCase().trim()
  for (const [platform, pattern] of LABEL_PATTERNS) {
    if (pattern.test(labelLower)) return platform
  }

  return 'website'
}
