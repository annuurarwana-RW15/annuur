import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { SectionHeading } from './SectionHeading'

const PRAYER_NAMES = ['Subuh', 'Zuhur', 'Ashar', 'Maghrib', 'Isya']

export function PrayerSchedule({ section }: { section: Section }) {
  const city = asText(readField(section.content, 'jadwal', 'city'))
  const method = asText(readField(section.content, 'jadwal', 'method'))
  const meta = [city ? `Kota ${city}` : '', method ? `Metode ${method}` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <section id="jadwal" aria-labelledby="jadwal-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="jadwal-judul">{section.title}</SectionHeading>

        <div className="mt-6 rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRAYER_NAMES.map((name) => (
              <li
                key={name}
                className="rounded-xl border border-emas/25 bg-krem px-4 py-3 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                  {name}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-hijau">—</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-hijau-tua/75">
            Jadwal sholat harian — menyusul.
            {meta && <span className="text-emas-tua"> {meta}</span>}
          </p>
        </div>
      </div>
    </section>
  )
}
