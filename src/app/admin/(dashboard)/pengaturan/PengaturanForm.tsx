'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import ImageField from '@/components/admin/ImageField'
import { setPengaturan, type PengaturanInput } from './actions'
import { RekeningEditor } from './RekeningEditor'
import { normalizeRekening, type RekeningRow } from './rekening'

interface PengaturanFormProps {
  initial: PengaturanInput
  kontakEditHref?: string
  footerEditHref?: string
  tiktokEditHref?: string
}

const fieldClass =
  'mt-1 block w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'
const labelClass = 'block text-sm font-medium text-neutral-700'

export function PengaturanForm({
  initial,
  kontakEditHref = '/admin/pengaturan/kontak',
  footerEditHref = '/admin/sections',
  tiktokEditHref = '/admin/sections',
}: PengaturanFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, startTransition] = useTransition()

  // State identitas & favicon
  const [siteName, setSiteName] = useState(initial.site.name)
  const [favicon, setFavicon] = useState(initial.site.favicon ?? '')

  // State SEO & Meta
  const [seoTitle, setSeoTitle] = useState(initial.seo.title)
  const [seoDescription, setSeoDescription] = useState(initial.seo.description)
  const [seoKeywords, setSeoKeywords] = useState(initial.seo.keywords ?? '')
  const [seoOgImage, setSeoOgImage] = useState(initial.seo.ogImage ?? '')
  const [seoAuthor, setSeoAuthor] = useState(initial.seo.author ?? '')
  const [seoRobots, setSeoRobots] = useState(initial.seo.robots ?? 'index')

  // State Webmaster
  const [webmasterGoogle, setWebmasterGoogle] = useState(initial.webmaster?.google ?? '')
  const [webmasterBing, setWebmasterBing] = useState(initial.webmaster?.bing ?? '')
  const [webmasterYandex, setWebmasterYandex] = useState(initial.webmaster?.yandex ?? '')

  // State Donasi Rekening & QRIS
  const [rekeningRows, setRekeningRows] = useState<RekeningRow[]>(() =>
    initial.donasi.rekening.map((row) => ({
      bank: row.bank,
      no: row.no,
      atasNama: row.atasNama,
      link: row.link ?? '',
    })),
  )
  const [qrisImage, setQrisImage] = useState(initial.donasi.qris.image)
  const [qrisCaption, setQrisCaption] = useState(initial.donasi.qris.caption)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const fd = new FormData(formEl)

    const normalized = normalizeRekening(rekeningRows)
    if (!normalized.ok) {
      setMessage({ ok: false, text: `Rekening: ${normalized.error}` })
      return
    }
    const rekening: PengaturanInput['donasi']['rekening'] = normalized.rows

    startTransition(async () => {
      const result = await setPengaturan({
        site: {
          name: String(fd.get('siteName') ?? '').trim(),
          address: String(fd.get('siteAddress') ?? '').trim(),
          phone: String(fd.get('sitePhone') ?? '').trim(),
          city: String(fd.get('siteCity') ?? '').trim(),
          favicon: favicon.trim(),
        },
        seo: {
          title: String(fd.get('seoTitle') ?? '').trim(),
          description: String(fd.get('seoDescription') ?? '').trim(),
          keywords: String(fd.get('seoKeywords') ?? '').trim(),
          ogImage: seoOgImage.trim(),
          author: String(fd.get('seoAuthor') ?? '').trim(),
          robots: seoRobots,
        },
        webmaster: {
          google: String(fd.get('webmasterGoogle') ?? '').trim(),
          bing: String(fd.get('webmasterBing') ?? '').trim(),
          yandex: String(fd.get('webmasterYandex') ?? '').trim(),
        },
        donasi: {
          rekening,
          qris: { image: qrisImage.trim(), caption: qrisCaption.trim() },
        },
        ga4: { id: String(fd.get('ga4Id') ?? '').trim() },
      })
      if (result.ok) {
        setMessage({ ok: true, text: 'Pengaturan dan konfigurasi SEO berhasil disimpan' })
        router.refresh()
      } else {
        setMessage({ ok: false, text: result.error ?? 'Gagal menyimpan pengaturan' })
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-black/10 bg-white p-6 shadow-sm"
    >
      {message && (
        <p
          role="status"
          className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 1. IDENTITAS MASJID & FAVICON */}
      <fieldset>
        <legend className="text-base font-semibold text-neutral-900">
          Identitas Masjid &amp; Favicon
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Identitas resmi lembaga masjid dan ikon tab browser yang tampil di pengunjung.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="siteName">
              Nama Masjid
            </label>
            <input
              id="siteName"
              name="siteName"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="siteAddress">
              Alamat
            </label>
            <input
              id="siteAddress"
              name="siteAddress"
              defaultValue={initial.site.address}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sitePhone">
              Telepon
            </label>
            <input
              id="sitePhone"
              name="sitePhone"
              defaultValue={initial.site.phone}
              className={fieldClass}
            />
          </div>
        </div>

        {/* Upload Favicon & Browser Tab Preview */}
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
          <p className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
            <span>🌐</span>
            <span>Favicon Website</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            Ikon kecil yang muncul di tab browser, bookmark, dan pintasan layar beranda seluler.
            Format disarankan: <strong>PNG, ICO, SVG, atau WebP</strong> (ukuran persegi, misal 32x32 atau 64x64 px).
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-[max-content_1fr] sm:items-center">
            <ImageField
              value={favicon}
              onChange={setFavicon}
              prefix="favicon"
              label="Unggah Favicon"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
            />

            {/* Mockup Tab Browser */}
            <div className="max-w-md">
              <span className="text-xs font-medium text-neutral-600 block mb-1.5">
                Pratinjau Tab Browser:
              </span>
              <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-neutral-300 bg-neutral-200/90 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 shadow-sm text-neutral-800 font-medium truncate max-w-xs">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favicon}
                      alt="Favicon preview"
                      className="h-4 w-4 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded bg-emerald-700 text-[10px] text-white flex items-center justify-center font-bold">
                      M
                    </span>
                  )}
                  <span className="truncate">{siteName || 'Masjid An-nuur Arwana'} — Beranda</span>
                  <span className="ml-1 text-neutral-400 hover:text-neutral-600 cursor-default">×</span>
                </div>
              </div>
              <div className="h-4 rounded-b border border-t-0 border-neutral-300 bg-white" />
            </div>
          </div>
        </div>
      </fieldset>

      {/* 2. LOKASI & SHOLAT */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <legend className="text-base font-semibold text-neutral-900">
          Lokasi &amp; Sholat
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Kota menentukan jadwal sholat di beranda (layanan API Kemenag/myquran).
          Default: <strong>Karawang</strong> — kosongkan hanya jika ingin memakai bawaan tersebut.
        </p>
        <div className="mt-3 max-w-sm">
          <label className={labelClass} htmlFor="siteCity">
            Kota
          </label>
          <input
            id="siteCity"
            name="siteCity"
            defaultValue={initial.site.city}
            placeholder="Karawang"
            className={fieldClass}
          />
        </div>
      </fieldset>

      {/* 3. SEO GLOBAL & META SEARCH ENGINE */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <legend className="text-base font-semibold text-neutral-900">
              SEO Global &amp; Meta Search Engine
            </legend>
            <p className="mt-1 text-sm text-neutral-500">
              Konfigurasi metadata, Open Graph, dan pratinjau saat tautan situs dibagikan ke Google, WhatsApp, dan media sosial.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
            ✓ SEO Friendly
          </span>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <div className="flex justify-between items-center">
              <label className={labelClass} htmlFor="seoTitle">
                Judul Utama Situs (Title Tag)
              </label>
              <span className={`text-xs ${seoTitle.length > 60 ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>
                {seoTitle.length} karakter (rekomendasi: 50–60)
              </span>
            </div>
            <input
              id="seoTitle"
              name="seoTitle"
              placeholder="Masjid An-nuur Arwana — Pusat Ibadah & Dakwah"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className={labelClass} htmlFor="seoDescription">
                Deskripsi Meta (Meta Description)
              </label>
              <span className={`text-xs ${seoDescription.length > 160 ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>
                {seoDescription.length} karakter (rekomendasi: 120–160)
              </span>
            </div>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              placeholder="Website resmi Masjid An-nuur Arwana. Menyajikan jadwal sholat akurat, Al-Qur'an digital 30 juz, transparansi laporan kas infaq/shadaqah, berita kegiatan umat, serta layanan donasi dakwah."
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="seoKeywords">
                Kata Kunci Meta (Keywords)
              </label>
              <input
                id="seoKeywords"
                name="seoKeywords"
                placeholder="masjid an-nuur, jadwal sholat, al quran digital, infaq shadaqah, karawang"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-neutral-400">
                Pisahkan dengan tanda koma (,).
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="seoAuthor">
                Penulis / Pemilik Situs (Author)
              </label>
              <input
                id="seoAuthor"
                name="seoAuthor"
                placeholder="DKM Masjid An-nuur Arwana"
                value={seoAuthor}
                onChange={(e) => setSeoAuthor(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Pengaturan Indeksasi Robots */}
          <div>
            <label className={labelClass} htmlFor="seoRobots">
              Kebijakan Indeksasi Mesin Pencari (Robots Tag)
            </label>
            <select
              id="seoRobots"
              name="seoRobots"
              value={seoRobots}
              onChange={(e) => setSeoRobots(e.target.value)}
              className={fieldClass}
            >
              <option value="index">
                Izinkan Pengindeksan (index, follow) — Sangat direkomendasikan untuk situs live/produksi
              </option>
              <option value="noindex">
                Cegah Pengindeksan (noindex, nofollow) — Gunakan saat perbaikan atau lingkungan uji coba
              </option>
            </select>
          </div>

          {/* Social Share Image & Live Card Preview */}
          <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
            <p className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
              <span>🖼️</span>
              <span>Gambar Berbagi Sosial (Open Graph &amp; Twitter Card)</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Gambar yang otomatis muncul saat link website dibagikan di WhatsApp, Telegram, Facebook, LinkedIn, atau Twitter/X.
              Ukuran ideal: <strong>1200 × 630 px</strong> (JPG / PNG / WebP).
            </p>

            <div className="mt-4 grid gap-6 md:grid-cols-[max-content_1fr] md:items-start">
              <ImageField
                value={seoOgImage}
                onChange={setSeoOgImage}
                prefix="seo"
                label="Unggah Gambar Open Graph"
                accept="image/jpeg,image/png,image/webp"
              />

              {/* Mockup Social Media Card */}
              <div className="max-w-md overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm">
                <div className="relative aspect-[1200/630] w-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                  {seoOgImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={seoOgImage}
                      alt="Social share preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400 p-4 text-center">
                      <span className="text-2xl mb-1">🕌</span>
                      <span className="text-xs">Pratinjau Gambar Berbagi (1200x630 px)</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-neutral-50/80 border-t border-neutral-200">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    masjid-annuur-arwana.id
                  </p>
                  <p className="font-semibold text-neutral-900 text-sm truncate mt-0.5">
                    {seoTitle || siteName || 'Masjid An-nuur Arwana'}
                  </p>
                  <p className="text-xs text-neutral-600 line-clamp-2 mt-1 leading-snug">
                    {seoDescription || 'Website resmi Masjid An-nuur Arwana — Jadwal sholat, Al-Qur\'an digital, berita, dan laporan transparansi kas.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* 4. VERIFIKASI WEBMASTER */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <legend className="text-base font-semibold text-neutral-900">
          Verifikasi Webmaster (Search Console)
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Verifikasi kepemilikan website pada Google Search Console, Bing Webmaster Tools, dan mesin pencari lainnya
          agar situs terindeks cepat dan dapat memantau kata kunci pencarian jamaah.
        </p>

        <div className="mt-4 grid gap-4">
          <div>
            <label className={labelClass} htmlFor="webmasterGoogle">
              Google Search Console (google-site-verification)
            </label>
            <input
              id="webmasterGoogle"
              name="webmasterGoogle"
              placeholder="Contoh: 4uH8d... atau <meta name=&quot;google-site-verification&quot; content=&quot;...&quot; />"
              value={webmasterGoogle}
              onChange={(e) => setWebmasterGoogle(e.target.value)}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Tempel token atau tag HTML lengkap yang diberikan Google Search Console saat verifikasi metode &ldquo;Tag HTML&rdquo;. Sistem otomatis mengambil kode verifikasi.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="webmasterBing">
                Bing Webmaster Tools (msvalidate.01)
              </label>
              <input
                id="webmasterBing"
                name="webmasterBing"
                placeholder="Kode verifikasi Bing"
                value={webmasterBing}
                onChange={(e) => setWebmasterBing(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webmasterYandex">
                Yandex Webmaster (yandex-verification)
              </label>
              <input
                id="webmasterYandex"
                name="webmasterYandex"
                placeholder="Kode verifikasi Yandex (opsional)"
                value={webmasterYandex}
                onChange={(e) => setWebmasterYandex(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Petunjuk Ringkas Google Search Console */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
            <p className="font-semibold text-blue-950 flex items-center gap-1.5 mb-1">
              <span>💡</span>
              <span>Cara Verifikasi di Google Search Console:</span>
            </p>
            <ol className="list-decimal ml-4 space-y-1 text-blue-800">
              <li>Buka <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-950">Google Search Console</a> dan tambahkan URL website Anda.</li>
              <li>Pilih metode verifikasi <strong>&ldquo;Tag HTML&rdquo;</strong> (HTML tag).</li>
              <li>Salin kode atau tag tersebut, lalu tempelkan ke kolom <strong>Google Search Console</strong> di atas.</li>
              <li>Klik tombol <strong>&ldquo;Simpan Pengaturan&rdquo;</strong> di bawah.</li>
              <li>Kembali ke Google Search Console dan klik tombol <strong>&ldquo;Verifikasi&rdquo;</strong>.</li>
            </ol>
          </div>
        </div>
      </fieldset>

      {/* 5. SITEMAP & ROBOTS.TXT OTOMATIS */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <legend className="text-base font-semibold text-neutral-900">
          Sitemap XML &amp; Robots.txt Otomatis
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Sitemap dan robots.txt di-generate secara dinamis dan otomatis sesuai standar ramah mesin pencari Googlebot.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Card Sitemap */}
          <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                  <span>🗺️</span>
                  <span>Sitemap XML Dinamis</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Aktif Otomatis
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                Menyajikan seluruh rute publik untuk Googlebot:
              </p>
              <ul className="mt-2 text-xs text-neutral-600 space-y-1 list-disc ml-4">
                <li>11 Halaman statis utama (Beranda, Profil, Kegiatan, Donasi, dsb.)</li>
                <li>Seluruh artikel berita dakwah terbit secara otomatis</li>
                <li><strong>114 Surah Al-Qur&apos;an digital</strong> terindeks individual</li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">/sitemap.xml</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Buka Sitemap XML ↗
              </a>
            </div>
          </div>

          {/* Card Robots.txt */}
          <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Robots.txt Ramah Mesin Pencari</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Aktif Otomatis
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                Aturan perayapan (crawling) yang dioptimasi khusus untuk Googlebot dan crawler modern:
              </p>
              <ul className="mt-2 text-xs text-neutral-600 space-y-1 list-disc ml-4">
                <li>Mengizinkan perayapan halaman publik &amp; file visual Next.js</li>
                <li>Memblokir area privat dashboard admin dan endpoint internal API</li>
                <li>Menautkan langsung lokasi file sitemap secara otomatis</li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">/robots.txt</span>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Buka Robots.txt ↗
              </a>
            </div>
          </div>
        </div>
      </fieldset>

      {/* 6. REKENING DONASI & QRIS */}
      <fieldset id="rekening" className="mt-8 border-t border-neutral-100 pt-6 scroll-mt-20">
        <legend className="text-base font-semibold text-neutral-900">
          Rekening Donasi
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Dipakai halaman /donasi dan section donasi beranda — isi manual bank, nomor, dan atas nama.
        </p>
        <div className="mt-3">
          <RekeningEditor rows={rekeningRows} onChange={setRekeningRows} />
        </div>
      </fieldset>

      <fieldset id="qris" className="mt-8 border-t border-neutral-100 pt-6 scroll-mt-20">
        <div className="flex items-center justify-between">
          <legend className="text-base font-semibold text-neutral-900">
            Kartu QRIS Donasi
          </legend>
          <a
            href="/#donasi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
          >
            <span>Lihat di Beranda</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Tampil pada <strong>Section Donasi di Beranda</strong> dan halaman <code>/donasi</code>.
          Unggah gambar QRIS (PNG/JPEG/WebP) dari rekening bank atau e-wallet resmi masjid.
        </p>
        <div className="mt-3 grid max-w-2xl gap-4 sm:grid-cols-[max-content_1fr] sm:items-start">
          <ImageField
            value={qrisImage}
            onChange={setQrisImage}
            prefix="qris"
            label="Gambar QRIS"
            accept="image/jpeg,image/png,image/webp"
          />
          <div className="max-w-sm">
            <label className={labelClass} htmlFor="qrisCaption">
              Nama / keterangan (opsional)
            </label>
            <input
              id="qrisCaption"
              value={qrisCaption}
              onChange={(event) => setQrisCaption(event.target.value)}
              placeholder="Masjid An-nuur Arwana"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Tercetak di bawah kode QRIS pada kartu donasi.
            </p>
          </div>
        </div>
      </fieldset>

      {/* 7. GOOGLE ANALYTICS 4 */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <legend className="text-base font-semibold text-neutral-900">
          Google Analytics 4
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Statistik pengunjung real-time dari Google Analytics.
        </p>
        <div className="mt-3 max-w-sm">
          <label className={labelClass} htmlFor="ga4Id">
            Google Analytics 4 ID
          </label>
          <input
            id="ga4Id"
            name="ga4Id"
            placeholder="G-XXXXXXXXXX"
            defaultValue={initial.ga4.id}
            className={fieldClass}
          />
        </div>
      </fieldset>

      {/* 8. JALAN PINTAS WIDGET & KONTAK */}
      <fieldset className="mt-8 border-t border-neutral-100 pt-6">
        <legend className="text-base font-semibold text-neutral-900">
          Kontak, Media Sosial &amp; Widget Beranda
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola informasi kontak dan peta lokasi masjid, tautan media sosial footer, serta sematan feed TikTok di beranda publik.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                <span>📍</span>
                <span>Kontak &amp; Google Maps</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Atur alamat fisik, telepon/WhatsApp, email resmi, jam operasional, serta tautan dan sematan peta interaktif Google Maps.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={kontakEditHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-800 transition"
              >
                Kelola Kontak &amp; Peta →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                <span>🌐</span>
                <span>Media Sosial Footer</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Kelola daftar platform, nama akun, dan link sosial media resmi DKM yang tampil pada footer situs.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={footerEditHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-800 transition"
              >
                Kelola Sosial Media Footer →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                <span>📱</span>
                <span>Widget Feed TikTok</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Atur akun official (@masjidannuurarwana) dan sematan feed konten dakwah TikTok di beranda publik.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={tiktokEditHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-800 transition"
              >
                Atur Widget Feed TikTok →
              </Link>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-8 border-t border-neutral-100 pt-6">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-green-900 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-800 transition disabled:opacity-60"
        >
          {busy ? 'Menyimpan Pengaturan…' : 'Simpan Pengaturan'}
        </button>
      </div>
    </form>
  )
}
