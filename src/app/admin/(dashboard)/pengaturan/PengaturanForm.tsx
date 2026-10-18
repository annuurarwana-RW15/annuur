'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setPengaturan, type PengaturanInput } from './actions'
import { RekeningEditor } from './RekeningEditor'
import { normalizeRekening, type RekeningRow } from './rekening'

interface PengaturanFormProps {
  initial: PengaturanInput
}

const fieldClass =
  'mt-1 block w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'
const labelClass = 'block text-sm font-medium text-neutral-700'

export function PengaturanForm({ initial }: PengaturanFormProps) {
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
        donasi: { rekening },
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
        </p>
        <div className="mt-3 max-w-sm">
          <label className={labelClass} htmlFor="siteCity">
            Kota
          </label>
          <input
            id="siteCity"
            name="siteCity"
            defaultValue={initial.site.city}
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
          Analitik
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
