'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { formatRupiah, parseRupiah } from '@/lib/format'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

const fieldClass =
  'w-full rounded-lg border border-emas/40 bg-white px-3 py-2.5 text-sm text-hijau-tua placeholder:text-hijau-tua/40 focus:outline-none focus-visible:ring-2 focus:ring-hijau/40'
const labelClass = 'block text-sm font-semibold text-hijau-tua'
const helperClass = 'mt-1 text-xs text-hijau-tua/60'
const errorClass = 'mt-1 text-xs font-medium text-red-600'

interface DonationFormProps {
  categories: { id: string; name: string }[]
}

interface DonasiSuccess {
  reference: string
}

export function DonationForm({ categories }: DonationFormProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [donorName, setDonorName] = useState('')
  const [nominal, setNominal] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [message, setMessage] = useState('')
  const [proofImage, setProofImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<DonasiSuccess | null>(null)

  function resetForm() {
    setDonorName('')
    setNominal('')
    setCategoryId('')
    setMessage('')
    setProofImage('')
    setUploadError(null)
    setErrors({})
    setFormError(null)
    setSuccess(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function validateClient(): Record<string, string> {
    const next: Record<string, string> = {}
    const name = donorName.trim()
    if (name.length < 2) next.donorName = 'Nama minimal 2 karakter.'
    else if (name.length > 80) next.donorName = 'Nama maksimal 80 karakter.'
    if (!(parseRupiah(nominal) > 0)) next.amount = 'Jumlah harus lebih dari 0.'
    if (message.trim().length > 500)
      next.message = 'Pesan maksimal 500 karakter.'
    return next
  }

  async function handleUpload(file: File) {
    setUploadError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      setUploadError('Ukuran file maksimal 5MB.')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/upload-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload gagal')

      const putRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('Upload ke penyimpanan gagal')

      setProofImage(data.publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setErrors({})

    const clientErrors = validateClient()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSaving(true)
    try {
      const payload = {
        donorName: donorName.trim(),
        amount: parseRupiah(nominal),
        ...(categoryId ? { categoryId } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(proofImage ? { proofImage } : {}),
      }
      const res = await fetch('/api/donasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.ok) {
        setSuccess({ reference: data.reference })
        return
      }
      if (data.fields && typeof data.fields === 'object') {
        setErrors(data.fields as Record<string, string>)
      }
      setFormError(
        data.error || (res.status === 429 ? 'Terlalu banyak permintaan.' : 'Gagal mengirim donasi.'),
      )
    } catch {
      setFormError('Gagal mengirim donasi. Periksa koneksi lalu coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="font-display text-2xl font-bold text-hijau">
          Donasi terkirim
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-hijau-tua/80">
          Donasi Anda sudah kami terima dan menunggu verifikasi pengurus.
          Simpan nomor referensi berikut untuk mengecek status donasi.
        </p>
        <p className="mt-5 rounded-xl bg-krem-tua px-4 py-3 text-center font-mono text-2xl font-bold tracking-wider text-hijau">
          {success.reference}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/donasi/status?ref=${encodeURIComponent(success.reference)}`}
            className="rounded-full bg-hijau px-5 py-2.5 text-sm font-semibold text-krem transition hover:bg-hijau-muda"
          >
            Cek status →
          </Link>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-emas/40 bg-white px-5 py-2.5 text-sm font-semibold text-hijau transition hover:bg-krem-tua"
          >
            Donasi lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-emas/30 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="font-display text-2xl font-bold text-hijau">
        Formulir Donasi
      </h2>
      <p className="mt-1 text-sm text-hijau-tua/70">
        Isi data berikut lalu transfer sesuai nominal. Donasi diverifikasi oleh
        pengurus.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block space-y-1">
          <span className={labelClass}>Nama donatur</span>
          <input
            type="text"
            value={donorName}
            required
            minLength={2}
            maxLength={80}
            placeholder="Contoh: Ahmad Fauzi"
            onChange={(e) => setDonorName(e.target.value)}
            className={fieldClass}
            aria-invalid={Boolean(errors.donorName)}
          />
          {errors.donorName ? (
            <p className={errorClass}>{errors.donorName}</p>
          ) : (
            <p className={helperClass}>Wajib, 2–80 karakter.</p>
          )}
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Jumlah (Rp)</span>
          <input
            type="text"
            inputMode="numeric"
            value={nominal}
            required
            placeholder="Contoh: 150000"
            onChange={(e) => setNominal(e.target.value)}
            onBlur={() => {
              const parsed = parseRupiah(nominal)
              if (nominal.trim() && Number.isFinite(parsed) && parsed > 0) {
                setNominal(formatRupiah(parsed))
              }
            }}
            className={fieldClass}
            aria-invalid={Boolean(errors.amount)}
          />
          {errors.amount ? (
            <p className={errorClass}>{errors.amount}</p>
          ) : (
            <p className={helperClass}>
              Wajib lebih dari 0. Otomatis diformat Rp saat field
              ditinggalkan.
            </p>
          )}
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Kategori (opsional)</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={fieldClass}
            aria-invalid={Boolean(errors.categoryId)}
          >
            <option value="">— Tanpa kategori —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <p className={errorClass}>{errors.categoryId}</p>
          ) : (
            <p className={helperClass}>Pilih agar donasi tercatat tepat sasaran.</p>
          )}
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Pesan (opsional)</span>
          <textarea
            value={message}
            maxLength={500}
            rows={3}
            placeholder="Doa atau harapan untuk masjid…"
            onChange={(e) => setMessage(e.target.value)}
            className={fieldClass}
            aria-invalid={Boolean(errors.message)}
          />
          {errors.message ? (
            <p className={errorClass}>{errors.message}</p>
          ) : (
            <p className={helperClass}>Maksimal 500 karakter.</p>
          )}
        </label>

        <div className="space-y-1">
          <span className={labelClass}>Bukti transfer (opsional)</span>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
              }}
              className="block text-sm text-hijau-tua/70 file:mr-3 file:rounded-full file:border-0 file:bg-hijau file:px-4 file:py-2 file:text-sm file:font-semibold file:text-krem hover:file:bg-hijau-muda"
            />
            {proofImage && (
              <button
                type="button"
                onClick={() => setProofImage('')}
                disabled={uploading}
                className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Hapus
              </button>
            )}
          </div>
          {proofImage && (
            // eslint-disable-next-line @next/next/no-img-element -- preview URL eksternal R2, next/image tidak cocok
            <img
              src={proofImage}
              alt="Bukti transfer"
              className="mt-2 h-24 w-24 rounded-lg border border-emas/30 object-cover"
            />
          )}
          {uploading && (
            <p className="text-sm text-hijau-tua/60">Mengunggah…</p>
          )}
          {uploadError ? (
            <p className={errorClass}>{uploadError}</p>
          ) : (
            <p className={helperClass}>
              JPG/PNG/WebP, maksimal 5MB. Opsional — boleh dikirim belakangan
              ke pengurus.
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 rounded-lg bg-krem px-4 py-3 text-xs leading-relaxed text-hijau-tua/80">
        Dengan mengirim donasi ini, saya menyatakan data yang diberikan benar.
        Donasi akan diverifikasi oleh pengurus sebelum dicatat pada laporan kas.
      </p>

      {formError && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploading}
        className="mt-5 w-full rounded-full bg-hijau px-5 py-3 text-sm font-semibold text-krem transition hover:bg-hijau-muda disabled:opacity-60"
      >
        {saving ? 'Mengirim…' : 'Kirim donasi'}
      </button>
    </form>
  )
}
