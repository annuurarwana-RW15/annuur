import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSurahDetail, getSurahMeta } from '@/lib/quran'
import { QuranReaderClient } from './QuranReaderClient'

interface PageProps {
  params: Promise<{ nomor: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nomor: rawNomor } = await params
  const nomor = parseInt(rawNomor, 10)
  if (Number.isNaN(nomor) || nomor < 1 || nomor > 114) {
    return { title: 'Surah Tidak Ditemukan — Masjid An-nuur Arwana' }
  }

  const meta = getSurahMeta(nomor)
  if (!meta) {
    return { title: 'Al-Qur\'an Digital — Masjid An-nuur Arwana' }
  }

  return {
    title: `Surah ${meta.namaLatin} (${meta.nama}) — Al-Qur'an Digital Masjid An-nuur Arwana`,
    description: `Baca Surah ${meta.namaLatin} (${meta.arti}) lengkap ${meta.jumlahAyat} ayat dengan teks Arab yang nyaman, transliterasi Latin, terjemahan Kemenag RI, dan audio murottal.`,
  }
}

export default async function SurahPage({ params }: PageProps) {
  const { nomor: rawNomor } = await params
  const nomor = parseInt(rawNomor, 10)

  if (Number.isNaN(nomor) || nomor < 1 || nomor > 114) {
    notFound()
  }

  const surah = await getSurahDetail(nomor)

  if (!surah) {
    return (
      <div className="bg-krem min-h-screen py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <div className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <span className="text-4xl">📖</span>
            <h2 className="mt-4 font-display text-2xl font-bold text-neutral-900">
              Gagal Memuat Surah
            </h2>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              Koneksi ke peladen Al-Qur&apos;an digital sedang mengalami kendala. Silakan coba beberapa saat lagi.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/quran"
                className="rounded-full bg-hijau px-5 py-2.5 text-xs font-semibold text-krem shadow hover:bg-hijau-tua transition"
              >
                Kembali ke Daftar Surah
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-krem min-h-screen py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4">
        <QuranReaderClient surah={surah} />
      </div>
    </div>
  )
}

