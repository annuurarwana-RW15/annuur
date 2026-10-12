'use client'

import ImageField from '@/components/admin/ImageField'
import { fieldClass, helperClass, labelClass } from './field-styles'

export interface SeoValues {
  seoTitle: string
  seoDescription: string
  seoImage: string
}

interface ArticleSeoFieldsProps {
  values: SeoValues
  onChange: (patch: Partial<SeoValues>) => void
}

/** Bagian SEO form artikel — dipisah agar `ArticleForm` tetap ringkas. */
export function ArticleSeoFields({ values, onChange }: ArticleSeoFieldsProps) {
  return (
    <section className="space-y-4 rounded-lg border border-black/10 bg-neutral-50/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-800">SEO</h3>
        <p className={helperClass}>
          Kosongkan bila ingin memakai judul & kutipan artikel.
        </p>
      </div>

      <label className="block space-y-1">
        <span className={labelClass}>Judul SEO</span>
        <input
          type="text"
          value={values.seoTitle}
          placeholder="Judul untuk tab browser & hasil pencarian"
          onChange={(event) => onChange({ seoTitle: event.target.value })}
          className={fieldClass}
        />
        <p className={helperClass}>Disarankan maksimal 60 karakter.</p>
      </label>

      <label className="block space-y-1">
        <span className={labelClass}>Deskripsi SEO</span>
        <textarea
          value={values.seoDescription}
          rows={3}
          placeholder="Ringkasan untuk hasil pencarian"
          onChange={(event) => onChange({ seoDescription: event.target.value })}
          className={fieldClass}
        />
        <p className={helperClass}>Disarankan maksimal 160 karakter.</p>
      </label>

      <ImageField
        label="Gambar SEO"
        prefix="articles"
        value={values.seoImage}
        onChange={(url) => onChange({ seoImage: url })}
      />
    </section>
  )
}
