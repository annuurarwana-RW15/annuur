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

        {/* 4 Feeds Terbaru TikTok */}
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-hijau-tua">
              <span className={`flex h-2 w-2 rounded-full ${scriptLoaded ? 'bg-emerald-500' : 'bg-emas'} animate-pulse`} />
              <span>4 Feeds Terbaru @{cleanUsername}</span>
            </div>
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emas-tua hover:text-hijau inline-flex items-center gap-1 transition"
            >
              <span>Lihat Semua di TikTok</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feed 1: Kajian & Kultum */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emas hover:shadow-md"
            >
              <div>
                {/* Visual Video Cover Preview */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-hijau via-hijau-tua to-black p-3 text-white shadow-inner">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-krem backdrop-blur-xs">
                      <SocialIcon platform="tiktok" className="h-3 w-3 text-white" />
                      <span>TikTok</span>
                    </span>
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                      01:00
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-xs text-white shadow transition group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                      <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-[11px] text-white/85 line-clamp-1">
                    ♫ Suara Asli - Dakwah Ringkas
                  </div>
                </div>

                {/* Deskripsi & Judul Feed */}
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-hijau">
                    <span>🕌</span>
                    <span>Kajian &amp; Kultum</span>
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-hijau transition">
                    Pesan Kebaikan, Adab Penuntut Ilmu &amp; Mutiara Hadits
                  </h4>
                  <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    Pesan kebaikan, adab harian penuntut ilmu, dan mutiara hadits ringkas.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">#KajianIslam</span>
                <span className="font-semibold text-hijau group-hover:text-emas-tua transition inline-flex items-center gap-0.5">
                  <span>Tonton</span>
                  <span>→</span>
                </span>
              </div>
            </a>

            {/* Feed 2: Dokumentasi Ibadah */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emas hover:shadow-md"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-800 via-teal-900 to-black p-3 text-white shadow-inner">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-krem backdrop-blur-xs">
                      <SocialIcon platform="tiktok" className="h-3 w-3 text-white" />
                      <span>TikTok</span>
                    </span>
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                      00:45
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-xs text-white shadow transition group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                      <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-[11px] text-white/85 line-clamp-1">
                    ♫ Lantunan Murottal Jamaah
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-hijau">
                    <span>📖</span>
                    <span>Dokumentasi Ibadah</span>
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-hijau transition">
                    Sholat Berjamaah, Qiyamul Lail &amp; Kebersamaan Jamaah
                  </h4>
                  <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    Cuplikan sholat Jumat, tarawih, qiyamul lail, dan tadarus Al-Qur&apos;an.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">#SholatBerjamaah</span>
                <span className="font-semibold text-hijau group-hover:text-emas-tua transition inline-flex items-center gap-0.5">
                  <span>Tonton</span>
                  <span>→</span>
                </span>
              </div>
            </a>

            {/* Feed 3: Khutbah & Tausiyah Jumat */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emas hover:shadow-md"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-900 via-stone-900 to-black p-3 text-white shadow-inner">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-krem backdrop-blur-xs">
                      <SocialIcon platform="tiktok" className="h-3 w-3 text-white" />
                      <span>TikTok</span>
                    </span>
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                      01:30
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-xs text-white shadow transition group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                      <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-[11px] text-white/85 line-clamp-1">
                    ♫ Nasehat Jumat Penuh Hikmah
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-hijau">
                    <span>🎙️</span>
                    <span>Tausiyah Jumat</span>
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-hijau transition">
                    Intisari Khutbah &amp; Nasihat Keimanan Mingguan
                  </h4>
                  <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    Pengingat amal shalih, tazkiyatun nufus, dan penguatan ukhuwah islamiyah.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">#JumatBerkah</span>
                <span className="font-semibold text-hijau group-hover:text-emas-tua transition inline-flex items-center gap-0.5">
                  <span>Tonton</span>
                  <span>→</span>
                </span>
              </div>
            </a>

            {/* Feed 4: Kegiatan Sosial DKM */}
            <a
              href={finalAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-emas/25 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emas hover:shadow-md"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-hijau-tua via-emerald-950 to-black p-3 text-white shadow-inner">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-krem backdrop-blur-xs">
                      <SocialIcon platform="tiktok" className="h-3 w-3 text-white" />
                      <span>TikTok</span>
                    </span>
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                      01:15
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur-xs text-white shadow transition group-hover:scale-110 group-hover:bg-emas group-hover:text-hijau">
                      <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-[11px] text-white/85 line-clamp-1">
                    ♫ Suara Asli - Khidmah Umat
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-hijau">
                    <span>🤝</span>
                    <span>Kegiatan Sosial DKM</span>
                  </div>
                  <h4 className="mt-1 font-bold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-hijau transition">
                    Laporan Santunan Yatim &amp; Penyaluran Sedekah
                  </h4>
                  <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    Laporan santunan anak yatim, pembagian sembako, dan gotong royong.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">#SedekahJariyah</span>
                <span className="font-semibold text-hijau group-hover:text-emas-tua transition inline-flex items-center gap-0.5">
                  <span>Tonton</span>
                  <span>→</span>
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

