import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { testimoniItems } from './content'
import { SectionHeading } from './SectionHeading'

export function TestimoniSection({ section }: { section: Section }) {
  const items = testimoniItems(readField(section.content, 'testimoni', 'items'))

  return (
    <section id="testimoni" aria-labelledby="testimoni-judul" className="bg-krem-tua/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="testimoni-judul">{section.title}</SectionHeading>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada testimoni.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <li
                key={`${item.nama}-${index}`}
                className="flex flex-col rounded-2xl border border-emas/25 bg-white p-6 shadow-sm"
              >
                <span aria-hidden="true" className="font-display text-5xl leading-none text-emas/60">
                  &ldquo;
                </span>
                <p className="mt-2 flex-1 leading-relaxed text-hijau-tua/85">{item.teks}</p>
                {item.rating !== null && (
                  <p
                    className="mt-3 text-emas"
                    aria-label={`Penilaian ${item.rating} dari 5`}
                  >
                    {'★'.repeat(item.rating)}
                    {'☆'.repeat(5 - item.rating)}
                  </p>
                )}
                <footer className="mt-4 border-t border-emas/20 pt-3">
                  <p className="font-semibold text-hijau">{item.nama}</p>
                  {item.peran && <p className="text-sm text-hijau-tua/70">{item.peran}</p>}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
