import type { SocialPlatform } from './social-platform'

interface IconDef {
  fill?: boolean
  paths: string[]
}

const ICONS: Record<SocialPlatform, IconDef> = {
  instagram: {
    paths: [
      'M17 2H7a5 5 0 00-5 5v10a5 5 0 005 5h10a5 5 0 005-5V7a5 5 0 00-5-5z',
      'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z',
      'M17.5 6.5h.01',
    ],
  },
  facebook: {
    paths: [
      'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
    ],
  },
  youtube: {
    paths: [
      'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z',
      'M9.75 15.02l5.75-3.27-5.75-3.27v6.54z',
    ],
  },
  tiktok: {
    paths: [
      'M15 3v10.5a4.5 4.5 0 11-4.5-4.5',
      'M15 3c.7 2.6 2.9 4.7 5.5 5.2',
    ],
  },
  x: {
    fill: true,
    paths: [
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    ],
  },
  whatsapp: {
    paths: [
      'M21 11.5a8.5 8.5 0 01-12.34 7.56L3.5 20.5l1.5-5A8.5 8.5 0 1121 11.5z',
      'M9 9.5c.4 1.8 1.7 3.1 3.5 3.5l1-1-1.5-1-.8.4c-.5-.3-1-.8-1.3-1.3l.4-.8-1-1.5-1 1c-.1 0-.2.1-.3.2z',
    ],
  },
  telegram: {
    paths: ['M22 2L11 13', 'M22 2L15 22l-4-9-9-4 20-7z'],
  },
  website: {
    paths: [
      'M12 22a10 10 0 100-20 10 10 0 000 20z',
      'M2 12h20',
      'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
    ],
  },
}

export interface SocialIconProps {
  platform: SocialPlatform
  className?: string
}

/** Ikon SVG inline 24×24 (currentColor) untuk chip social media di footer. */
export function SocialIcon({ platform, className = 'h-4 w-4' }: SocialIconProps) {
  const def = ICONS[platform]
  return (
    <svg
      viewBox="0 0 24 24"
      fill={def.fill ? 'currentColor' : 'none'}
      stroke={def.fill ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {def.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
