'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Article } from '@prisma/client'
import ImageField from '@/components/admin/ImageField'
import { slugify } from '@/lib/slugify'
import { saveArticle } from './actions'
import { ARTICLE_STATUSES, type ArticleStatus } from './status'
import { fieldClass, helperClass, labelClass } from './field-styles'
import { ArticleSeoFields, type SeoValues } from './ArticleSeoFields'

interface ArticleFormProps {
  /** Ada = mode edit (slug & publishedAt lama dipertahankan). */
  article?: Article
  /** Saran kategori dari artikel yang sudah ada. */
  categories: string[]
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
  required?: boolean
  placeholder?: string
  /** id <datalist> untuk saran nilai. */
  list?: string
}

function TextField({
  label,
  value,
  onChange,
  helper,
  required,
  placeholder,
  list,
}: TextFieldProps) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        list={list}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
      {helper ? <p className={helperClass}>{helper}</p> : null}
    </label>
  )
}

interface TextAreaFieldProps extends Omit<TextFieldProps, 'required'> {
  rows?: number
}

function TextAreaField({
  label,
  value,
  onChange,
  helper,
  placeholder,
  rows = 4,
}: TextAreaFieldProps) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} leading-relaxed`}
      />
      {helper ? <p className={helperClass}>{helper}</p> : null}
    </label>
  )
}

export function ArticleForm({ article, categories }: ArticleFormProps) {
  const router = useRouter()
  const isEdit = Boolean(article)

  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  // Pada mode buat baru slug mengikuti judul sampai diubah manual.
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? '')
  const [body, setBody] = useState(article?.body ?? '')
  const [category, setCategory] = useState(article?.category ?? '')
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? 'DRAFT')
  const [seo, setSeo] = useState<SeoValues>({
    seoTitle: article?.seoTitle ?? '',
    seoDescription: article?.seoDescription ?? '',
    seoImage: article?.seoImage ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setSaving(true)
    try {
      const result = await saveArticle({
        ...(article ? { id: article.id } : {}),
        title,
        slug,
        excerpt,
        coverImage,
        body,
        category,
        status,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        seoImage: seo.seoImage,
      })
      if (result.ok) {
        router.push('/admin/artikel')
        router.refresh()
      } else {
        setFeedback({ kind: 'err', message: result.error })
      }
    } catch (err) {
      setFeedback({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Gagal menyimpan',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit artikel' : 'Artikel baru'}
          </h2>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            {isEdit ? `/${article?.slug}` : 'draf baru'}
          </p>
        </div>
        <Link
          href="/admin/artikel"
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Judul"
            value={title}
            onChange={handleTitleChange}
            required
            placeholder="Contoh: Pengajian Rutin Mingguan"
          />
        </div>

        <div className="sm:col-span-2">
          <TextField
            label="Slug"
            value={slug}
            onChange={(value) => {
              setSlugTouched(true)
              setSlug(value)
            }}
            placeholder="otomatis-dari-judul"
            helper={
              isEdit
                ? `URL publik: /berita/${slug || '(otomatis dari judul)'} — bila bentrok dengan artikel lain otomatis ditambah -2.`
                : 'Diisi otomatis dari judul, boleh diubah. Bila bentrok dengan artikel lain otomatis ditambah -2.'
            }
          />
        </div>

        <TextField
          label="Kategori"
          value={category}
          onChange={setCategory}
          list="artikel-kategori"
          placeholder="Contoh: Kegiatan"
          helper="Saran muncul dari kategori artikel yang sudah ada."
        />

        <label className="block space-y-1">
          <span className={labelClass}>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ArticleStatus)}
            className={fieldClass}
          >
            {ARTICLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className={helperClass}>
            {status === 'PUBLISHED'
              ? 'Tampil di halaman publik saat disimpan.'
              : 'Hanya terlihat di admin.'}
          </p>
        </label>

        <div className="sm:col-span-2">
          <TextAreaField
            label="Kutipan (excerpt)"
            value={excerpt}
            onChange={setExcerpt}
            rows={3}
            placeholder="Ringkasan singkat untuk daftar berita."
            helper="Dipakai di daftar berita & deskripsi SEO bila seoDescription kosong."
          />
        </div>

        <div className="sm:col-span-2">
          <ImageField
            label="Gambar sampul"
            prefix="articles"
            value={coverImage}
            onChange={setCoverImage}
          />
        </div>

        <div className="sm:col-span-2">
          <TextAreaField
            label="Isi artikel"
            value={body}
            onChange={setBody}
            rows={14}
            placeholder="Tulis isi artikel di sini…"
            helper="Didukung markdown ringan: ## judul, **tebal**, *miring*, - daftar, [teks](https://…)."
          />
        </div>
      </div>

      <datalist id="artikel-kategori">
        {categories.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

      <ArticleSeoFields values={seo} onChange={(patch) => setSeo((prev) => ({ ...prev, ...patch }))} />

      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan artikel'}
        </button>
        <Link
          href="/admin/artikel"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          Batal
        </Link>
        {feedback ? (
          <p
            role={feedback.kind === 'ok' ? 'status' : 'alert'}
            className={`text-sm ${feedback.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
