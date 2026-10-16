'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ImageField from '@/components/admin/ImageField'
import { updateSection } from './actions'
import { buildContent, readField } from './section-content'
import { SocialLinksEditor } from './SocialLinksEditor'
import { normalizeSocialLinks } from './social-links'

interface FieldDef {
  name: string
  label: string
  widget?: 'input' | 'textarea' | 'image' | 'json' | 'social'
  helper?: string
  rows?: number
}

const FIELDS: Record<string, readonly FieldDef[]> = {
  hero: [
    { name: 'subjudul', label: 'Subjudul' },
    { name: 'imageUrl', label: 'Gambar latar', widget: 'image' },
    { name: 'ctaLabel', label: 'Label tombol CTA' },
    { name: 'ctaHref', label: 'Link tombol CTA', helper: 'Contoh: /donasi' },
  ],
  profil: [
    { name: 'text', label: 'Teks profil', widget: 'textarea', rows: 8 },
  ],
  jadwal: [
    { name: 'text', label: 'Keterangan', widget: 'textarea', rows: 4 },
  ],
  jumat: [
    {
      name: 'items',
      label: 'Daftar jadwal khotib (JSON)',
      widget: 'json',
      rows: 8,
      helper:
        'Array objek { "tanggal": "2026-10-16", "khatib": "Ust. …", "imam": "Ust. …" }. tanggal format YYYY-MM-DD.',
    },
  ],
  pengumuman: [
    { name: 'text', label: 'Keterangan', widget: 'textarea', rows: 4 },
  ],
  galeri: [
    {
      name: 'images',
      label: 'Daftar gambar (JSON)',
      widget: 'json',
      rows: 8,
      helper: 'Kelola foto lewat menu Galeri (upload/URL). JSON ini dijaga sinkron — { "url": "…", "caption": "…" } per item.',
    },
  ],
  testimoni: [
    {
      name: 'items',
      label: 'Daftar testimoni (JSON)',
      widget: 'json',
      rows: 10,
      helper:
        'Array objek { "nama": "…", "peran": "Jamaah", "teks": "…", "rating": 5 }. rating opsional 1–5.',
    },
  ],
  kontak: [
    { name: 'alamat', label: 'Alamat' },
    { name: 'telp', label: 'Telepon' },
    { name: 'email', label: 'Email' },
    { name: 'jam', label: 'Jam layanan' },
    {
      name: 'mapQuery',
      label: 'Embed peta',
      widget: 'textarea',
      rows: 3,
      helper: 'Koordinat/pencarian OpenStreetMap, contoh: -6.2,106.8',
    },
  ],
  footer: [
    { name: 'text', label: 'Teks', widget: 'textarea', rows: 3 },
    {
      name: 'social',
      label: 'Social media',
      widget: 'social',
      helper: 'Isi manual tiap baris (nama + URL). Contoh: Instagram → https://instagram.com/…',
    },
  ],
}

export interface SectionFormSection {
  id: string
  key: string
  title: string
  content: unknown
}

interface SectionFormProps {
  section: SectionFormSection
  backHref: string
}

const fieldClass =
  'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-900/40'
const labelClass = 'block text-sm font-medium text-neutral-700'
const helperClass = 'mt-1 text-xs text-neutral-500'

function stringify(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

interface GalleryItem {
  url: string
  caption?: string
}

export function SectionForm({ section, backHref }: SectionFormProps) {
  const router = useRouter()
  const defs = FIELDS[section.key] ?? []
  const [title, setTitle] = useState(section.title)
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const def of defs) {
      initial[def.name] = stringify(readField(section.content, section.key, def.name))
    }
    return initial
  })
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const galleryPreview = useMemo(() => {
    if (section.key !== 'galeri') return []
    try {
      const parsed: unknown = JSON.parse(draft.images || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item): item is GalleryItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as { url?: unknown }).url === 'string',
      )
    } catch {
      return []
    }
  }, [draft.images, section.key])

  function setField(name: string, value: string) {
    setDraft((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)

    const finalTitle = title.trim()
    const fields: Record<string, unknown> = {}
    try {
      for (const def of defs) {
        const raw = draft[def.name] ?? ''
        if (def.widget === 'json' || def.widget === 'social') {
          let parsed: unknown
          try {
            parsed = JSON.parse(raw || '[]')
          } catch {
            throw new Error(`${def.label}: JSON tidak valid`)
          }
          if (def.widget === 'social') {
            const result = normalizeSocialLinks(parsed)
            if (!result.ok) {
              throw new Error(`${def.label}: ${result.error}`)
            }
            fields[def.name] = result.rows
            continue
          }
          if (!Array.isArray(parsed)) {
            throw new Error(`${def.label}: harus berupa array JSON`)
          }
          fields[def.name] = parsed
        } else {
          fields[def.name] = raw
        }
      }
    } catch (err) {
      setStatus({
        kind: 'err',
        message: err instanceof Error ? err.message : 'JSON tidak valid',
      })
      return
    }

    setSaving(true)
    try {
      const content = buildContent(section.key, section.content, finalTitle, fields)
      const result = await updateSection(section.id, finalTitle, content)
      if (result.ok) {
        setStatus({ kind: 'ok', message: 'Tersimpan.' })
        router.refresh()
      } else {
        setStatus({ kind: 'err', message: result.error ?? 'Gagal menyimpan' })
      }
    } catch (err) {
      setStatus({
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
      className="mt-4 space-y-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Edit section</h2>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{section.key}</p>
        </div>
        <Link
          href={backHref}
          className="text-sm font-medium text-green-900 hover:underline"
        >
          ← Kembali
        </Link>
      </div>

      <label className="space-y-1">
        <span className={labelClass}>Judul</span>
        <input
          type="text"
          value={title}
          required
          onChange={(event) => setTitle(event.target.value)}
          className={fieldClass}
        />
      </label>

      {defs.map((def) => {
        if (def.widget === 'image') {
          return (
            <ImageField
              key={def.name}
              label={def.label}
              prefix="sections"
              value={draft[def.name] ?? ''}
              onChange={(url) => setField(def.name, url)}
            />
          )
        }
        if (def.widget === 'social') {
          return (
            <SocialLinksEditor
              key={def.name}
              value={draft[def.name] ?? ''}
              onChange={(next) => setField(def.name, next)}
              helper={def.helper}
            />
          )
        }
        if (def.widget === 'textarea' || def.widget === 'json') {
          return (
            <label key={def.name} className="block space-y-1">
              <span className={labelClass}>{def.label}</span>
              <textarea
                value={draft[def.name] ?? ''}
                rows={def.rows ?? 5}
                spellCheck={def.widget !== 'json'}
                onChange={(event) => setField(def.name, event.target.value)}
                className={`${fieldClass} ${def.widget === 'json' ? 'font-mono text-xs' : ''}`}
              />
              {def.helper ? <p className={helperClass}>{def.helper}</p> : null}
            </label>
          )
        }
        return (
          <label key={def.name} className="block space-y-1">
            <span className={labelClass}>{def.label}</span>
            <input
              type="text"
              value={draft[def.name] ?? ''}
              onChange={(event) => setField(def.name, event.target.value)}
              className={fieldClass}
            />
            {def.helper ? <p className={helperClass}>{def.helper}</p> : null}
          </label>
        )
      })}

      {galleryPreview.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {galleryPreview.map((item, index) => (
            <figure key={`${item.url}-${index}`} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview URL eksternal R2 */}
              <img
                src={item.url}
                alt={item.caption ?? `Galeri ${index + 1}`}
                className="h-20 w-full rounded-md border border-black/10 object-cover"
              />
              {item.caption ? (
                <figcaption className="truncate text-xs text-neutral-500">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        {status ? (
          <p
            role="status"
            className={`text-sm ${status.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
