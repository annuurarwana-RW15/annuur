import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { galleryItems } from '@/components/public/content'
import { GalleryGrid } from '@/components/public/GallerySection'
import { SectionHeading } from '@/components/public/SectionHeading'

export const revalidate = 60

export const metadata: Metadata = { title: 'Galeri' }

export default async function GaleriPage() {
  const section = await db.section.findFirst({
    where: { key: 'galeri', isVisible: true },
  })
  if (!section) notFound()

  const items = galleryItems(readField(section.content, 'galeri', 'images'))

  return (
    <section className="bg-krem-tua/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">{section.title || 'Galeri'}</SectionHeading>

        {items.length === 0 ? (
          <p className="mt-6 text-hijau-tua/70">Belum ada foto.</p>
        ) : (
          <div className="mt-6">
            <GalleryGrid items={items} className="grid-cols-2 sm:grid-cols-3" />
          </div>
        )}
      </div>
    </section>
  )
}
