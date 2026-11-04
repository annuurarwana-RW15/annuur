import type { Metadata } from 'next'
import { getAllSurahs } from '@/lib/quran'
import { SectionHeading } from '@/components/public/SectionHeading'
import { QuranIndexClient } from './QuranIndexClient'

export const metadata: Metadata = {
  title: 'Al-Qur\'an Digital — Masjid An-nuur Arwana',
  description:
    'Baca Al-Qur\'an digital 30 juz lengkap dengan teks Arab yang nyaman dibaca, transliterasi Latin, terjemahan resmi bahasa Indonesia, dan audio murottal.',
}

export default function QuranPage() {
  const surahs = getAllSurahs()

  return (
    <div className="bg-krem min-h-screen py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header Seksi */}
        <div className="mb-8">
          <SectionHeading id="quran-judul">Al-Qur&apos;an Digital</SectionHeading>
          <p className="mt-3 text-base text-hijau-tua/80 max-w-2xl leading-relaxed">
            Membaca firman Allah SWT secara nyaman dan mudah dipahami, dilengkapi dengan
            transliterasi Latin, terjemahan resmi Kementerian Agama RI, dan audio murottal per ayat.
          </p>
        </div>

        {/* Client Interactive Index */}
        <QuranIndexClient surahs={surahs} />
      </div>
    </div>
  )
}

