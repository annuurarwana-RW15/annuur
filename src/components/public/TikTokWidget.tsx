'use client'

import { useEffect, useState } from 'react'
import { SocialIcon } from './SocialIcon'

export interface TikTokWidgetProps {
  username?: string
  accountUrl?: string
  videoId?: string
  description?: string
}

export function TikTokWidget({
  username = '@masjidannuurarwana',
  accountUrl = 'https://www.tiktok.com/@masjidannuurarwana',
  videoId = '',
  description = 'Ikuti kabar dakwah, cuplikan kegiatan, dan kajian bermanfaat melalui akun TikTok resmi Masjid An-nuur Arwana.',
}: TikTokWidgetProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Bersihkan format username (hapus @ dan url prefix jika ada)
  const cleanUsername =
    username
      .trim()
      .replace(/^@/, '')
      .replace(/.*tiktok\.com\/@?/, '')
      .replace(/\/.*$/, '') || 'masjidannuurarwana'

  const finalAccountUrl =
    accountUrl.trim() || `https://www.tiktok.com/@${cleanUsername}`

  // Parse videoId (bisa single id atau beberapa id dipisahkan koma/spasi/newline)
  const videoIds = videoId
    .split(/[,\s]+/)
    .map((v) => v.trim().replace(/.*\/video\//, '').replace(/\?.*/, ''))
    .filter(Boolean)

  useEffect(() => {
    // Muat script resmi embed TikTok dengan re-mount bersih agar parser TikTok selalu berjalan
    const scriptId = 'tiktok-embed-script'
    const existing = document.getElementById(scriptId)
    if (existing) {
      existing.remove()
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://www.tiktok.com/embed.js'
    script.async = true
    script.onload = () => {
      setScriptLoaded(true)
      const win = window as unknown as { tiktokEmbed?: { lib?: { render?: () => void } } }
      if (typeof win.tiktokEmbed?.lib?.render === 'function') {
        win.tiktokEmbed.lib.render()
      }
    }
    document.body.appendChild(script)
  }, [cleanUsername, videoId])

  return (
    <div className="space-y-6">
      {/* Kartu Profil & Identitas TikTok Official */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-emas/30 bg-gradient-to-r from-hijau to-hijau-tua p-5 text-krem shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/40 text-krem ring-2 ring-emas/60">
            <SocialIcon platform="tiktok" className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg text-krem">
                Masjid An-nuur Arwana
              </h3>
              <span className="inline-flex items-center rounded-full bg-emas/20 px-2 py-0.5 text-xs font-semibold text-emas-muda border border-emas/40">
                Official
              </span>
            </div>
            <p className="text-sm text-krem/80">@{cleanUsername}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={finalAccountUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emas px-5 py-2.5 text-sm font-semibold text-hijau shadow transition hover:bg-emas-muda hover:shadow-md"
          >
            <SocialIcon platform="tiktok" className="h-4 w-4" />
            <span>Kunjungi @{cleanUsername}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {description ? (
        <p className="text-base leading-relaxed text-hijau-tua/85 max-w-3xl">
          {description}
        </p>
      ) : null}

      {/* Embed Feed / Video TikTok Resmi */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emas/25 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
        {videoIds.length > 0 ? (
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-hijau-tua">
                <span className={`flex h-2 w-2 rounded-full ${scriptLoaded ? 'bg-emerald-500' : 'bg-emas'} animate-pulse`} />
                <span>Video TikTok Pilihan @{cleanUsername}</span>
              </div>
              <a
                href={finalAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emas-tua hover:text-hijau inline-flex items-center gap-1 transition"
              >
                <span>Buka Profil @{cleanUsername}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div
              className={`grid gap-6 justify-items-center ${
                videoIds.length === 1
                  ? 'grid-cols-1 max-w-md mx-auto'
                  : videoIds.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full'
              }`}
            >
              {videoIds.map((id) => (
                <div key={id} className="w-full flex justify-center">
                  <blockquote
                    className="tiktok-embed"
                    cite={`${finalAccountUrl}/video/${id}`}
                    data-video-id={id}
                    style={{ maxWidth: '605px', minWidth: '280px', width: '100%' }}
                  >
                    <section>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`${finalAccountUrl}/video/${id}`}
                        className="text-hijau font-semibold hover:underline"
                      >
                        Tonton video @{cleanUsername} di TikTok
                      </a>
                    </section>
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
            <blockquote
              className="tiktok-embed"
              cite={finalAccountUrl}
              data-unique-id={cleanUsername}
              data-embed-type="creator"
              style={{ maxWidth: '780px', minWidth: '288px', width: '100%' }}
            >
              <section>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${finalAccountUrl}?refer=creator_embed`}
                  className="text-hijau font-semibold hover:underline"
                >
                  @{cleanUsername}
                </a>
              </section>
            </blockquote>
          </div>
        )}
      </div>
    </div>
  )
}

