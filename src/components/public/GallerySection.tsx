import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { galleryItems, type GalleryItem } from './content'
import { SectionHeading } from './SectionHeading'

export function GalleryGrid({
  items,
  className = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}: {
  items: GalleryItem[]
  className?: string
}) {
  return (
    <ul className={`grid gap-4 ${className}`.trim()}>
      {items.map((item, index) => (
        <li
          key={`${item.url}-${index}`}
          className="overflow-hidden rounded-2xl border border-emas/25 bg-white shadow-sm"
        >
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL galeri dari penyimpanan eksternal, di luar image optimizer */}
            <img
              src={item.url}
              alt={galleryAlt(item)}
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
  )
}

/** Alt: caption bila ada, lalu nama berkas dari URL, lalu fallback generik. */
function galleryAlt(item: GalleryItem): string {
  if (item.caption) return item.caption
  try {
    const last = new URL(item.url, 'https://placeholder.invalid').pathname
      .split('/')
      .pop()
    const name = decodeURIComponent(last || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_+]+/g, ' ')
      .trim()
    if (name) return `Foto ${name}`
  } catch {
    /* URL tak terbaca → fallback */
  }
  return 'Foto galeri Masjid An-Nur Arwana'
}

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
          <div className="mt-6">
            <GalleryGrid items={items} />
          </div>
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
