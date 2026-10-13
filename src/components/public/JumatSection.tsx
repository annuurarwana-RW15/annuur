import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { formatDateID } from '@/lib/format'
import { jumatItems } from './content'
import { SectionHeading } from './SectionHeading'

const DAY_FORMAT = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })

function formatJumatDate(iso: string): { hari: string; tanggal: string } | null {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return { hari: DAY_FORMAT.format(date), tanggal: formatDateID(date) }
}

export function JumatSection({ section }: { section: Section }) {
  const items = jumatItems(readField(section.content, 'jumat', 'items'))

  return (
    <section id="jumat" aria-labelledby="jumat-judul" className="bg-krem">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="jumat-judul">{section.title}</SectionHeading>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Jadwal khotib belum diatur.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => {
              const date = formatJumatDate(item.tanggal)
              return (
                <li
                  key={`${item.tanggal}-${index}`}
                  className="rounded-2xl border border-emas/25 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
                    {date ? date.hari : 'Jumat'}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-hijau">
                    {date ? date.tanggal : item.tanggal}
                  </p>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div>
                      <dt className="text-hijau-tua/60">Khotib</dt>
                      <dd className="font-semibold text-hijau-tua">{item.khatib}</dd>
                    </div>
                    {item.imam && (
                      <div>
                        <dt className="text-hijau-tua/60">Imam</dt>
                        <dd className="text-hijau-tua">{item.imam}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
