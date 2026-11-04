'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import ImageField from '@/components/admin/ImageField'
import { setPengaturan, type PengaturanInput } from './actions'
import { RekeningEditor } from './RekeningEditor'
import { normalizeRekening, type RekeningRow } from './rekening'

interface PengaturanFormProps {
  initial: PengaturanInput
  footerEditHref?: string
  tiktokEditHref?: string
}

const fieldClass =
  'mt-1 block w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'
const labelClass = 'block text-sm font-medium text-neutral-700'

export function PengaturanForm({
  initial,
  footerEditHref = '/admin/sections',
  tiktokEditHref = '/admin/sections',
}: PengaturanFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, startTransition] = useTransition()
  const [rekeningRows, setRekeningRows] = useState<RekeningRow[]>(() =>
    initial.donasi.rekening.map((row) => ({
      bank: row.bank,
      no: row.no,
      atasNama: row.atasNama,
      link: row.link ?? '',
    })),
  )
  const [qrisImage, setQrisImage] = useState(initial.donasi.qris.image)
  const [qrisCaption, setQrisCaption] = useState(initial.donasi.qris.caption)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const fd = new FormData(formEl)

    const normalized = normalizeRekening(rekeningRows)
    if (!normalized.ok) {
      setMessage({ ok: false, text: `Rekening: ${normalized.error}` })
      return
    }
    const rekening: PengaturanInput['donasi']['rekening'] = normalized.rows

    startTransition(async () => {
      const result = await setPengaturan({
        site: {
          name: String(fd.get('siteName') ?? '').trim(),
          address: String(fd.get('siteAddress') ?? '').trim(),
          phone: String(fd.get('sitePhone') ?? '').trim(),
          city: String(fd.get('siteCity') ?? '').trim(),
        },
        seo: {
          title: String(fd.get('seoTitle') ?? '').trim(),
          description: String(fd.get('seoDescription') ?? '').trim(),
        },
        donasi: {
          rekening,
          qris: { image: qrisImage.trim(), caption: qrisCaption.trim() },
        },
        ga4: { id: String(fd.get('ga4Id') ?? '').trim() },
      })
      if (result.ok) {
        setMessage({ ok: true, text: 'Pengaturan tersimpan' })
        router.refresh()
      } else {
        setMessage({ ok: false, text: result.error ?? 'Gagal menyimpan' })
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-black/10 bg-white p-6 shadow-sm"
    >
      {message && (
        <p
          role="status"
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            message.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {message.text}
        </p>
      )}

      <fieldset>
        <legend className="text-base font-semibold text-neutral-900">
          Identitas Masjid
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="siteName">
              Nama
            </label>
            <input
              id="siteName"
              name="siteName"
              required
              defaultValue={initial.site.name}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="siteAddress">
              Alamat
            </label>
            <input
              id="siteAddress"
              name="siteAddress"
              defaultValue={initial.site.address}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sitePhone">
              Telepon
            </label>
            <input
              id="sitePhone"
              name="sitePhone"
              defaultValue={initial.site.phone}
              className={fieldClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          Lokasi &amp; Sholat
        </legend>
        <p className="mt-2 text-sm text-neutral-500">
          Kota menentukan jadwal sholat di beranda (layanan myquran).
          Default: <strong>Karawang</strong> — kosongkan hanya jika ingin
          memakai bawaan tersebut.
        </p>
        <div className="mt-3 max-w-sm">
          <label className={labelClass} htmlFor="siteCity">
            Kota
          </label>
          <input
            id="siteCity"
            name="siteCity"
            defaultValue={initial.site.city}
            placeholder="Karawang"
            className={fieldClass}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          Rekening Donasi
        </legend>
        <p className="mt-2 text-sm text-neutral-500">
          Dipakai halaman /donasi — isi manual bank, nomor, dan atas nama.
        </p>
        <div className="mt-3">
          <RekeningEditor rows={rekeningRows} onChange={setRekeningRows} />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          Kartu QRIS
        </legend>
        <p className="mt-2 text-sm text-neutral-500">
          Tampil sebagai kartu compact di section Laporan Keuangan beranda.
          Kosongkan gambar untuk menyembunyikan kartu.
        </p>
        <div className="mt-3 grid max-w-2xl gap-4 sm:grid-cols-[max-content_1fr] sm:items-start">
          <ImageField
            value={qrisImage}
            onChange={setQrisImage}
            prefix="qris"
            label="Gambar QRIS"
            accept="image/jpeg,image/png,image/webp"
          />
          <div className="max-w-sm">
            <label className={labelClass} htmlFor="qrisCaption">
              Nama / keterangan (opsional)
            </label>
            <input
              id="qrisCaption"
              value={qrisCaption}
              onChange={(event) => setQrisCaption(event.target.value)}
              placeholder="Masjid An-nuur Arwana"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Tercetak di bawah judul &ldquo;Donasi via QRIS&rdquo; pada kartu.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          SEO Global
        </legend>
        <p className="mt-2 text-sm text-neutral-500">
          Judul &amp; deskripsi bawaan situs — sumber metadata dan Open Graph
          seluruh halaman yang tidak menyetel judulnya sendiri.
        </p>
        <div className="mt-3 grid gap-4">
          <div className="max-w-sm">
            <label className={labelClass} htmlFor="seoTitle">
              Judul
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              placeholder="Masjid An-nuur Arwana"
              defaultValue={initial.seo.title}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="seoDescription">
              Deskripsi
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              defaultValue={initial.seo.description}
              className={fieldClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          GA4
        </legend>
        <div className="mt-4 max-w-sm">
          <label className={labelClass} htmlFor="ga4Id">
            Google Analytics 4 ID
          </label>
          <input
            id="ga4Id"
            name="ga4Id"
            placeholder="G-XXXXXXXXXX"
            defaultValue={initial.ga4.id}
            className={fieldClass}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-neutral-900">
          Media Sosial &amp; Widget Beranda
        </legend>
        <p className="mt-1 text-sm text-neutral-500">
          Tautan media sosial masjid (TikTok, Instagram, YouTube, WhatsApp, dll) yang tampil di footer dan sematan feed TikTok di beranda.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="font-semibold text-neutral-900 text-sm">Media Sosial Footer</p>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Kelola daftar platform, nama akun, dan link sosial media resmi DKM yang tampil pada footer situs.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={footerEditHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-800 transition"
              >
                Kelola Sosial Media Footer →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="font-semibold text-neutral-900 text-sm">Widget Feed TikTok</p>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Atur akun official (@masjidannuurarwana) dan sematan feed konten dakwah TikTok di beranda publik.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={tiktokEditHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-800 transition"
              >
                Atur Widget Feed TikTok →
              </Link>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-8">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
        >
          {busy ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
      </div>
    </form>
  )
}
