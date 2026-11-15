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

        {/* Feed Video TikTok (Kartu Video Vertikal Khas TikTok 9:16) */}
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-hijau-tua">
              <span className={`flex h-2 w-2 rounded-full ${scriptLoaded ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <span>Video Pendek &amp; Dakwah TikTok Terbaru</span>
            </div>
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-emas hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Semua di TikTok</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Kajian */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] max-h-[460px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-emerald-950 to-black p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ring-1 ring-white/10"
            >
              {/* Overlay Pattern & Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emas/20 via-transparent to-black/80" />
              
              {/* Badge TikTok & Durasi */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-krem border border-white/10">
                  <SocialIcon platform="tiktok" className="h-3.5 w-3.5 text-white" />
                  <span>TikTok</span>
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-mono text-white/80">
                  01:00
                </span>
              </div>

              {/* Icon Play di Tengah */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                  <svg className="h-6 w-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Info Video di Bawah */}
              <div className="relative z-10 mt-auto flex flex-col justify-end pt-32">
                <div className="flex items-center gap-1.5 text-xs text-emas-muda font-semibold">
                  <span>🕌</span>
                  <span>Kajian &amp; Mutiara Hadits</span>
                </div>
                <h4 className="mt-1 font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-emas-muda transition-colors">
                  Pesan Kebaikan, Adab Menuntut Ilmu &amp; Keutamaan Berjamaah
                </h4>
                <p className="mt-1.5 text-[11px] text-white/70">
                  #kajianislam #masjidannuur #dakwahtiktok
                </p>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/15 text-[11px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate">@{cleanUsername}</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-white/60">
                    <span>♫ Suara Asli</span>
                  </span>
                </div>
              </div>
            </a>

            {/* Card 2: Ibadah & Suasana */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] max-h-[460px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-hijau-tua to-black p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ring-1 ring-white/10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-black/80" />
              
              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-krem border border-white/10">
                  <SocialIcon platform="tiktok" className="h-3.5 w-3.5 text-white" />
                  <span>TikTok</span>
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-mono text-white/80">
                  00:45
                </span>
              </div>

              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                  <svg className="h-6 w-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              <div className="relative z-10 mt-auto flex flex-col justify-end pt-32">
                <div className="flex items-center gap-1.5 text-xs text-emas-muda font-semibold">
                  <span>📖</span>
                  <span>Dokumentasi Ibadah</span>
                </div>
                <h4 className="mt-1 font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-emas-muda transition-colors">
                  Suasana Sholat Berjamaah, Qiyamul Lail &amp; Kebersamaan Jamaah
                </h4>
                <p className="mt-1.5 text-[11px] text-white/70">
                  #sholatberjamaah #masjidannuur #tadarus
                </p>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/15 text-[11px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate">@{cleanUsername}</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-white/60">
                    <span>♫ Murottal Merdu</span>
                  </span>
                </div>
              </div>
            </a>

            {/* Card 3: Kegiatan Sosial DKM */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] max-h-[460px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-amber-950 to-black p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ring-1 ring-white/10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-black/80" />
              
              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-krem border border-white/10">
                  <SocialIcon platform="tiktok" className="h-3.5 w-3.5 text-white" />
                  <span>TikTok</span>
                </span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-mono text-white/80">
                  01:15
                </span>
              </div>

              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                  <svg className="h-6 w-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              <div className="relative z-10 mt-auto flex flex-col justify-end pt-32">
                <div className="flex items-center gap-1.5 text-xs text-emas-muda font-semibold">
                  <span>🤝</span>
                  <span>Kegiatan Sosial DKM</span>
                </div>
                <h4 className="mt-1 font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-emas-muda transition-colors">
                  Laporan Santunan Anak Yatim, Berbagi Sembako &amp; Khidmah Umat
                </h4>
                <p className="mt-1.5 text-[11px] text-white/70">
                  #santunan #sedekahjariyah #khidmahumat
                </p>
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/15 text-[11px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate">@{cleanUsername}</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-white/60">
                    <span>♫ Suara Asli DKM</span>
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

