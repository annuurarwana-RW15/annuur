import type { Section } from '@prisma/client'
import Link from 'next/link'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText, safeHref } from './content'
import { StarGlyph } from './SectionHeading'

export function Hero({ section }: { section: Section }) {
  const subjudul = asText(readField(section.content, 'hero', 'subjudul'))
  const imageUrl = asText(readField(section.content, 'hero', 'imageUrl'))
  const ctaLabel =
    asText(readField(section.content, 'hero', 'ctaLabel')) || 'Donasi Sekarang'
  const ctaHref =
    safeHref(asText(readField(section.content, 'hero', 'ctaHref'))) || '/donasi'

  return (
    <section className="relative isolate overflow-hidden bg-hijau text-krem">
      {imageUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
        />
      )}
      {imageUrl && <div aria-hidden="true" className="absolute inset-0 bg-hijau/85" />}
      <div aria-hidden="true" className="ornament absolute inset-0 opacity-80" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mb-5 flex items-center gap-3 text-emas" aria-hidden="true">
          <StarGlyph />
          <span className="h-px w-16 bg-current opacity-70" />
        </div>
        <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight sm:text-6xl">
          {section.title}
        </h1>
        {subjudul && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-krem/85 sm:text-xl">
            {subjudul}
          </p>
        )}
        <div className="mt-8">
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-full bg-emas px-7 py-3 font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
