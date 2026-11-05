import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { galleryItems } from './content'
import { GalleryGrid } from './GalleryGrid'
import { SectionHeading } from './SectionHeading'

export { GalleryGrid }

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
