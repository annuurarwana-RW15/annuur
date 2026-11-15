import Image from 'next/image'
import Link from 'next/link'
import type { MaintenanceConfig } from '@/lib/maintenance'

export function MaintenanceView({
  config,
  siteName = 'Masjid An-nuur Arwana',
  whatsapp = '',
}: {
  config: MaintenanceConfig
  siteName?: string
  whatsapp?: string
}) {
  const cleanWa = whatsapp.replace(/[^0-9]/g, '')
  const waUrl = cleanWa
    ? `https://wa.me/${cleanWa}?text=${encodeURIComponent(
        'Assalamu’alaikum Pengurus DKM Masjid An-nuur Arwana, saya ingin bertanya terkait informasi masjid.',
      )}`
    : null

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-emas/30 bg-white p-6 sm:p-10 text-center shadow-xl shadow-black/5 ring-1 ring-emas/10">
        {/* Logo Masjid */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-hijau/10 ring-4 ring-emas/30 p-3 shadow-inner">
          <Image
            src="/icon.png"
            alt={siteName}
            width={64}
            height={64}
            className="h-auto w-auto object-contain"
            priority
          />
        </div>

        {/* Badge Status */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-900">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Sedang Dalam Pemeliharaan Sistem</span>
        </div>

        {/* Judul & Pesan */}
        <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-hijau-tua tracking-tight leading-snug">
          {config.title}
        </h1>

        <p className="mt-3 text-sm sm:text-base leading-relaxed text-hijau-tua/80 whitespace-pre-line">
          {config.message}
        </p>

        {/* Estimasi Waktu Selesai (Jika Ada) */}
        {config.estimatedEnd && (
          <div className="mt-6 inline-block rounded-2xl border border-emas/20 bg-krem/40 px-5 py-3 text-xs sm:text-sm text-hijau-tua">
            <span className="font-semibold text-emas-tua">Estimasi Selesai: </span>
            <span className="font-medium">{config.estimatedEnd}</span>
          </div>
        )}

        {/* Tombol Kontak Darurat & Login Admin */}
        <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-center gap-3">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <span>Hubungi Pengurus via WA</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}

          <Link
            href="/admin/login"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 transition"
          >
            <span>Masuk Petugas / Admin</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-neutral-400">
          © {new Date().getFullYear()} {siteName}. Mohon doanya demi kelancaran dan perbaikan layanan.
        </p>
      </div>
    </div>
  )
}
