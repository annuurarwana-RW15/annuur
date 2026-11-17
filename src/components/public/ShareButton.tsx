'use client'

import { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'

export interface ShareData {
  title: string
  text?: string
  url?: string
}

export interface ShareButtonProps {
  title: string
  text?: string
  url?: string
  /**
   * 'dropdown' = ikon tombol share kecil dengan popover menu (cocok untuk kartu/card).
   * 'inline' = deretan tombol share horizontal lengkap (cocok untuk detail halaman/artikel).
   */
  variant?: 'dropdown' | 'inline'
  className?: string
  label?: string
}

/**
 * Komponen Share multi-platform: WhatsApp, Telegram, Facebook, X (Twitter), Salin Link, dan Web Share API.
 */
export function ShareButton({
  title,
  text = '',
  url = '',
  variant = 'dropdown',
  className = '',
  label = 'Bagikan',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fullUrl, setFullUrl] = useState(url)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      if (url.startsWith('/')) {
        setFullUrl(`${origin}${url}`)
      } else if (!url) {
        setFullUrl(window.location.href)
      } else {
        setFullUrl(url)
      }
    }
  }, [url])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const shareText = text ? `${title} — ${text}` : title

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${shareText}\n\nSelengkapnya: ${fullUrl}`,
    )}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(
      fullUrl,
    )}&text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      fullUrl,
    )}`,
    x: `https://x.com/intent/tweet?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(fullUrl)}`,
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        })
        return true
      } catch {
        // Pengguna membatalkan share, fallback ke menu
        return false
      }
    }
    return false
  }

  async function handleCopyLink(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Fallback manual jika clipboard API ditolak
      const input = document.createElement('input')
      input.value = fullUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Di mobile bila ada native share, coba panggil native share terlebih dahulu
    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 640 &&
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      typeof navigator.share === 'function'
    ) {
      const handled = await handleNativeShare()
      if (handled) return
    }

    setOpen((prev) => !prev)
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span className="text-xs font-semibold text-hijau-tua/75 flex items-center gap-1.5 mr-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-emas"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{label}:</span>
        </span>

        {/* WhatsApp */}
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke WhatsApp"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 transition hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-2xs"
        >
          <SocialIcon platform="whatsapp" className="h-3.5 w-3.5" />
          <span>WhatsApp</span>
        </a>

        {/* Telegram */}
        <a
          href={shareLinks.telegram}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke Telegram"
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 border border-sky-200 transition hover:bg-sky-600 hover:text-white hover:border-sky-600 shadow-2xs"
        >
          <SocialIcon platform="telegram" className="h-3.5 w-3.5" />
          <span>Telegram</span>
        </a>

        {/* Facebook */}
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke Facebook"
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 border border-blue-200 transition hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-2xs"
        >
          <SocialIcon platform="facebook" className="h-3.5 w-3.5" />
          <span>Facebook</span>
        </a>

        {/* X (Twitter) */}
        <a
          href={shareLinks.x}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke X (Twitter)"
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-800 border border-neutral-300 transition hover:bg-black hover:text-white hover:border-black shadow-2xs"
        >
          <SocialIcon platform="x" className="h-3.5 w-3.5" />
          <span>X</span>
        </a>

        {/* Salin Tautan */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="Salin tautan ke clipboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 border border-neutral-300 transition hover:bg-krem hover:text-hijau-tua shadow-2xs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-neutral-500"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{copied ? '✓ Tersalin!' : 'Salin Link'}</span>
        </button>
      </div>
    )
  }

  // Variant 'dropdown' (Cocok di card / tombol ringkas)
  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Bagikan ${title}`}
        title="Bagikan ke media sosial"
        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-emas/30 bg-white/95 text-hijau-tua shadow-2xs transition hover:bg-emas/20 hover:border-emas hover:text-hijau focus:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {/* Popover Menu Bagikan */}
      {open && (
        <div
          role="menu"
          aria-label="Pilihan bagikan"
          className="absolute right-0 bottom-full mb-2 z-30 w-48 rounded-2xl border border-emas/30 bg-white p-2 shadow-lg ring-1 ring-black/5 animate-zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-hijau-tua/60 border-b border-black/5">
            Bagikan Ke
          </div>

          <div className="mt-1 space-y-0.5">
            <a
              href={shareLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
            >
              <SocialIcon platform="whatsapp" className="h-4 w-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <a
              href={shareLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 transition"
            >
              <SocialIcon platform="telegram" className="h-4 w-4 text-sky-600" />
              <span>Telegram</span>
            </a>

            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition"
            >
              <SocialIcon platform="facebook" className="h-4 w-4 text-blue-600" />
              <span>Facebook</span>
            </a>

            <a
              href={shareLinks.x}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition"
            >
              <SocialIcon platform="x" className="h-4 w-4 text-neutral-900" />
              <span>X (Twitter)</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-neutral-500"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? '✓ Tersalin!' : 'Salin Tautan'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
