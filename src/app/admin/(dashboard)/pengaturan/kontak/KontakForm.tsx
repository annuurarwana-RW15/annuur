'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setKontakSettings, type KontakInput } from './actions'
import { GoogleMapEmbed } from '@/components/public/MapEmbed'

interface KontakFormProps {
  initial: KontakInput
}

const fieldClass =
  'mt-1 block w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'
const labelClass = 'block text-sm font-medium text-neutral-700'

export function KontakForm({ initial }: KontakFormProps) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [alamat, setAlamat] = useState(initial.alamat)
  const [telp, setTelp] = useState(initial.telp)
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp)
  const [email, setEmail] = useState(initial.email)
  const [jam, setJam] = useState(initial.jam)
  const [mapUrl, setMapUrl] = useState(initial.mapUrl)
  const [mapQuery, setMapQuery] = useState(initial.mapQuery)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const res = await setKontakSettings({
        alamat,
        telp,
        whatsapp,
        email,
        jam,
        mapUrl,
        mapQuery,
      })

      if (res.ok) {
        setMessage({ ok: true, text: 'Informasi kontak dan Google Maps berhasil disimpan.' })
        router.refresh()
      } else {
        setMessage({ ok: false, text: res.error || 'Gagal menyimpan pengaturan kontak.' })
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Tombol Navigasi Cepat & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/pengaturan"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-900 hover:text-green-700"
        >
          <span>← Kembali ke Pengaturan Umum</span>
        </Link>
        <Link
          href="/kontak"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-emas/40 bg-white px-3.5 py-1 text-xs font-semibold text-hijau hover:bg-krem transition shadow-xs"
        >
          <span>Lihat Halaman Kontak Publik ↗</span>
        </Link>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-xs flex items-center justify-between gap-3 ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{message.ok ? '✓' : '⚠️'}</span>
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Formulir Input Data Kontak */}
        <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-black/5 pb-3 flex items-center gap-2">
            <span>📞</span>
            <span>Kontak Resmi Masjid &amp; DKM</span>
          </h2>
          <p className="mt-2 text-xs text-neutral-500">
            Informasi ini akan ditampilkan pada section kontak di beranda, halaman khusus <code>/kontak</code>, dan bagian informasi masjid.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {/* Alamat Lengkap */}
            <div className="sm:col-span-2">
              <label htmlFor="alamat" className={labelClass}>
                Alamat Lengkap Masjid
              </label>
              <textarea
                id="alamat"
                rows={3}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Perumahan Arwana Blok B No. 15, Kel. Sukaharja, Kec. Telukjambe Timur, Kab. Karawang, Jawa Barat 41361"
                className={fieldClass}
                required
              />
              <p className="mt-1 text-xs text-neutral-500">
                Alamat fisik masjid yang lengkap agar memudahkan jamaah dan kurir pengiriman.
              </p>
            </div>

            {/* Nomor Telepon */}
            <div>
              <label htmlFor="telp" className={labelClass}>
                Nomor Telepon Sekretariat
              </label>
              <input
                id="telp"
                type="text"
                value={telp}
                onChange={(e) => setTelp(e.target.value)}
                placeholder="Contoh: 0812-3456-7890 atau (0267) 123456"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Akan otomatis memunculkan tombol panggil telepon (<code>tel:</code>).
              </p>
            </div>

            {/* Nomor WhatsApp */}
            <div>
              <label htmlFor="whatsapp" className={labelClass}>
                Nomor WhatsApp Official DKM
              </label>
              <input
                id="whatsapp"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Akan otomatis dibuatkan tombol hijau <strong>Chat WhatsApp DKM</strong> langsung.
              </p>
            </div>

            {/* Email Resmi */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Resmi DKM
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: dkm@annuur-arwana.id"
                className={fieldClass}
              />
            </div>

            {/* Jam Layanan */}
            <div>
              <label htmlFor="jam" className={labelClass}>
                Jam Layanan &amp; Kunjungan Sekretariat
              </label>
              <input
                id="jam"
                type="text"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                placeholder="Contoh: Setiap Hari, Subuh - Isya (04.00 - 21.00 WIB)"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* Formulir Input Google Maps */}
        <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-black/5 pb-3 flex items-center gap-2">
            <span>🗺️</span>
            <span>Pengaturan Google Maps &amp; Navigasi Rute</span>
          </h2>
          <p className="mt-2 text-xs text-neutral-500">
            Atur tautan langsung ke aplikasi Google Maps dan sematan peta interaktif untuk memudahkan jamaah menemukan lokasi masjid.
          </p>

          <div className="mt-6 space-y-5">
            {/* Link Google Maps */}
            <div>
              <label htmlFor="mapUrl" className={labelClass}>
                Link / Tautan Google Maps
              </label>
              <input
                id="mapUrl"
                type="text"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="Contoh: https://maps.app.goo.gl/xyz atau https://maps.google.com/?q=Masjid+An-Nuur+Arwana"
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Tautan yang dibuka saat pengunjung mengklik tombol <strong>&ldquo;Buka di Google Maps&rdquo;</strong>.
              </p>
            </div>

            {/* Embed / Sematan Peta */}
            <div>
              <label htmlFor="mapQuery" className={labelClass}>
                Sematan Peta (Kode <code>&lt;iframe&gt;</code> atau Link Embed Google Maps)
              </label>
              <textarea
                id="mapQuery"
                rows={3}
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                placeholder='Contoh: <iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" ...></iframe>'
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                💡 <em>Opsional:</em> Anda bisa menempelkan langsung kode sematan HTML (iframe) dari fitur &ldquo;Bagikan &gt; Sematkan peta&rdquo; di Google Maps. Jika dikosongkan, sistem secara otomatis merender peta Google Maps berdasarkan alamat masjid di atas.
              </p>
            </div>

            {/* Panduan Cara Mendapatkan Link & Iframe dari Google Maps */}
            <div className="rounded-xl border border-emas/20 bg-amber-50/60 p-4 text-xs text-neutral-700 space-y-2">
              <p className="font-bold text-emas-tua flex items-center gap-1.5">
                <span>📌</span>
                <span>Cara Mengambil Link &amp; Sematan dari Google Maps:</span>
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-neutral-600">
                <li>Buka situs <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-green-900 underline font-semibold">maps.google.com</a> dan cari lokasi <strong>Masjid An-nuur Arwana</strong>.</li>
                <li>Klik tombol <strong>&ldquo;Bagikan&rdquo; (Share)</strong>.</li>
                <li>Untuk link: pilih tab <strong>&ldquo;Kirim tautan&rdquo;</strong> lalu klik <strong>&ldquo;Salin tautan&rdquo;</strong>, tempelkan ke kolom <em>Link Google Maps</em> di atas.</li>
                <li>Untuk sematan: pilih tab <strong>&ldquo;Sematkan peta&rdquo;</strong> lalu klik <strong>&ldquo;Salin HTML&rdquo;</strong>, tempelkan ke kolom <em>Sematan Peta</em> di atas.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Live Preview Pratinjau Tampilan */}
        <div className="rounded-2xl border border-emas/30 bg-neutral-50/70 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <h3 className="font-display text-lg font-bold text-hijau-tua flex items-center gap-2">
              <span>👁️</span>
              <span>Pratinjau Peta Interaktif (Live Preview)</span>
            </h3>
            <span className="text-xs text-neutral-500 italic">
              Sesuai dengan tampilan front end
            </span>
          </div>

          <div className="mt-5">
            <GoogleMapEmbed
              mapQuery={mapQuery}
              mapUrl={mapUrl}
              alamat={alamat || 'Masjid An-nuur Arwana, Karawang'}
              title="Pratinjau Lokasi Masjid"
            />
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-green-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-800 transition disabled:opacity-60 flex items-center gap-2"
          >
            {busy ? (
              <>
                <span>⏳</span>
                <span>Menyimpan Kontak &amp; Peta…</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Simpan Kontak &amp; Peta Google Maps</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

