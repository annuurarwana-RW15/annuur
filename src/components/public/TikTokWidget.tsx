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

  const cleanVideoId = videoId.trim().replace(/.*\/video\//, '').replace(/\?.*/, '')

  useEffect(() => {
    // Muat script resmi embed TikTok
    const scriptId = 'tiktok-embed-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://www.tiktok.com/embed.js'
      script.async = true
      script.onload = () => setScriptLoaded(true)
      document.body.appendChild(script)
    } else {
      setScriptLoaded(true)
      // Jika script sudah ada (misal re-mount navigasi), trigger reload
      const win = window as unknown as { tiktokEmbed?: { lib?: { render?: () => void } } }
      if (typeof win.tiktokEmbed?.lib?.render === 'function') {
        win.tiktokEmbed.lib.render()
      }
    }
  }, [cleanUsername, cleanVideoId])

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
        {cleanVideoId ? (
          <blockquote
            className="tiktok-embed"
            cite={`${finalAccountUrl}/video/${cleanVideoId}`}
            data-video-id={cleanVideoId}
            style={{ maxWidth: '605px', minWidth: '325px', width: '100%' }}
          >
            <section>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${finalAccountUrl}/video/${cleanVideoId}`}
                className="text-hijau font-semibold hover:underline"
              >
                Tonton video @{cleanUsername} di TikTok
              </a>
            </section>
          </blockquote>
        ) : (
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
                href={finalAccountUrl}
                className="text-hijau font-semibold hover:underline"
              >
                @{cleanUsername}
              </a>
            </section>
          </blockquote>
        )}

        {/* Fallback & Konten Unggulan bila script TikTok belum selesai me-render */}
        {!scriptLoaded && (
          <div className="mt-4 w-full grid gap-4 sm:grid-cols-3 text-left">
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-black/10 bg-krem/40 p-4 transition hover:border-emas hover:bg-krem hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-hijau">
                <span className="text-xl">🕌</span>
                <span className="font-semibold text-sm">Kajian &amp; Kultum</span>
              </div>
              <p className="mt-2 text-xs text-hijau-tua/75 line-clamp-2">
                Pesan kebaikan, adab harian, dan mutiara hadits ringkas.
              </p>
            </a>

            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-black/10 bg-krem/40 p-4 transition hover:border-emas hover:bg-krem hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-hijau">
                <span className="text-xl">📖</span>
                <span className="font-semibold text-sm">Dokumentasi Ibadah</span>
              </div>
              <p className="mt-2 text-xs text-hijau-tua/75 line-clamp-2">
                Cuplikan sholat Jumat, tarawih, qiyamul lail, dan tadarus.
              </p>
            </a>

            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-black/10 bg-krem/40 p-4 transition hover:border-emas hover:bg-krem hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-hijau">
                <span className="text-xl">🤝</span>
                <span className="font-semibold text-sm">Kegiatan Sosial DKM</span>
              </div>
              <p className="mt-2 text-xs text-hijau-tua/75 line-clamp-2">
                Laporan santunan anak yatim, pembagian sembako, dan gotong royong.
              </p>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

