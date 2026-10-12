import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { galleryItems } from './content'
import { SectionHeading } from './SectionHeading'

export function GallerySection({ section }: { section: Section }) {
  const items = galleryItems(readField(section.content, 'galeri', 'images'))

  return (
    <section
      id="galeri"
      aria-labelledby="galeri-judul"
      className="bg-krem-tua/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading id="galeri-judul">{section.title}</SectionHeading>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada foto.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <li
                key={`${item.url}-${index}`}
                className="overflow-hidden rounded-2xl border border-emas/25 bg-white shadow-sm"
              >
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL galeri dari penyimpanan eksternal, di luar image optimizer */}
                  <img
                    src={item.url}
                    alt={item.caption || 'Foto galeri Masjid An-Nur Arwana'}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {item.caption && (
                    <figcaption className="px-3 py-2 text-xs text-hijau-tua/75">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <Link
            href="/galeri"
            className="font-semibold text-emas-tua transition hover:text-hijau hover:underline"
          >
            Buka galeri lengkap →
          </Link>
        </div>
      </div>
    </section>
  )
}
