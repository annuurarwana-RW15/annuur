'use client'

import { useRef, useState } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

interface ImageFieldProps {
  value?: string
  onChange: (url: string) => void
  prefix?: string
  label?: string
  accept?: string
}

export default function ImageField({
  value,
  onChange,
  prefix = 'uploads',
  label = 'Gambar',
  accept = 'image/jpeg,image/png,image/webp',
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Ukuran file maksimal 5MB.')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          prefix,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Upload gagal')
      }

      const putRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        throw new Error('Upload ke penyimpanan gagal')
      }

      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}

      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- preview URL eksternal R2, next/image tidak cocok
        <img
          src={value}
          alt={label}
          className="h-28 w-28 rounded-lg border border-zinc-200 object-cover"
        />
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
          className="block text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={uploading}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>

      {uploading && (
        <p className="text-sm text-zinc-500">Mengunggah…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
