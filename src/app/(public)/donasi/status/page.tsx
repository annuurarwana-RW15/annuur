import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { formatDateID, formatRupiah } from '@/lib/format'
import { SectionHeading } from '@/components/public/SectionHeading'

export const metadata: Metadata = { title: 'Cek Status Donasi' }

/**
 * Panjang `reference` valid = 12 (`DON-` + 8); batas 20 menahan percobaan
 * pemindaian referensi acak tanpa membuang request ke database.
 * Rate-limit view dilewati: referensi 8-char base36 tidak dapat ditebak
 * dan endpoint hanya membaca satu baris (tidak ada nilai enumerasi).
 */
const REF_MAX_LENGTH = 20

const STATUS_PRESENTATION = {
  MENUNGGU: {
    label: 'Menunggu verifikasi',
    detail: 'Menunggu verifikasi pengurus.',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  DIKONFIRMASI: {
    label: 'Terkonfirmasi',
    detail: 'Donasi terkonfirmasi. Terima kasih atas donasi Anda.',
    badgeClass: 'bg-green-100 text-green-800',
  },
  DITOLAK: {
    label: 'Ditolak',
    detail:
      'Donasi ditolak. Silakan hubungi pengurus untuk keterangan lebih lanjut.',
    badgeClass: 'bg-red-100 text-red-700',
  },
} as const

interface DonasiStatusPageProps {
  searchParams: Promise<{ ref?: string | string[] }>
}

export default async function DonasiStatusPage({
  searchParams,
}: DonasiStatusPageProps) {
  const params = await searchParams
  const raw = Array.isArray(params.ref) ? params.ref[0] : params.ref
  const reference = raw?.trim() ?? ''

  // Case-sensitive, tanpa fuzzy match — referensi salah huruf = tidak ditemukan.
  const donation =
    reference.length > 0 && reference.length <= REF_MAX_LENGTH
      ? await db.donation.findUnique({ where: { reference } })
      : null

  if (!donation) {
    return (
      <section className="bg-krem">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <SectionHeading as="h1">Cek Status Donasi</SectionHeading>
          <div className="mt-8 rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-xl font-bold text-hijau">
              Referensi tidak ditemukan
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-hijau-tua/80">
              Kami tidak menemukan donasi dengan referensi{' '}
              <span className="font-mono font-semibold">
                {reference || '—'}
              </span>
              . Periksa kembali kode referensi pada bukti pengiriman, atau
              hubungi pengurus bila masalah berlanjut.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const presentation =
    STATUS_PRESENTATION[donation.status] ?? STATUS_PRESENTATION.MENUNGGU

  return (
    <section className="bg-krem">
      <div className="mx-auto max-w-2xl px-4 py-14">
        <SectionHeading as="h1">Cek Status Donasi</SectionHeading>

        <div className="mt-8 rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-hijau">
              Donasi {donation.donorName}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${presentation.badgeClass}`}
            >
              {presentation.label}
            </span>
          </div>

          <p className="mt-4 font-mono text-2xl font-bold tracking-wider text-hijau">
            {donation.reference}
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                Jumlah
              </dt>
              <dd className="mt-1 font-semibold text-hijau-tua">
                {formatRupiah(donation.amount.toNumber())}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                Tanggal kirim
              </dt>
              <dd className="mt-1 text-hijau-tua">
                {formatDateID(donation.createdAt)}
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-lg bg-krem px-4 py-3 text-sm leading-relaxed text-hijau-tua/80">
            {presentation.detail}
            {donation.status === 'DITOLAK' && donation.rejectNote && (
              <>
                {' '}
                Catatan pengurus:{' '}
                <span className="font-medium">{donation.rejectNote}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
