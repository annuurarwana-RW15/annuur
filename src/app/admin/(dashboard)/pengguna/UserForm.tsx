'use client'

import type { Role } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveUser } from './actions'

export interface UserFormData {
  id?: string
  name: string
  email: string
  role: string
  isActive: boolean
}

interface UserFormProps {
  initial: UserFormData
  backHref: string
}

const fieldClass =
  'mt-1 block w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-900 focus:outline-none'
const labelClass = 'block text-sm font-medium text-neutral-700'

export function UserForm({ initial, backHref }: UserFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const fd = new FormData(formEl)
    const password = String(fd.get('password') ?? '')

    startTransition(async () => {
      const result = await saveUser({
        ...(initial.id ? { id: initial.id } : {}),
        name: String(fd.get('name') ?? '').trim(),
        email: String(fd.get('email') ?? '').trim(),
        role: String(fd.get('role') ?? 'VIEWER') as Role,
        isActive: fd.get('isActive') === 'on',
        ...(password ? { password } : {}),
      })
      if (result.ok) {
        router.push(backHref)
        router.refresh()
      } else {
        setError(result.error ?? 'Gagal menyimpan')
        formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold text-neutral-900">
        {initial.id ? 'Edit Pengguna' : 'Pengguna Baru'}
      </h2>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="user-name">
            Nama
          </label>
          <input
            id="user-name"
            name="name"
            required
            defaultValue={initial.name}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="user-email">
            Email
          </label>
          <input
            id="user-email"
            name="email"
            type="email"
            required
            defaultValue={initial.email}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="user-role">
            Role
          </label>
          <select
            id="user-role"
            name="role"
            defaultValue={initial.role}
            className={fieldClass}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="BENDAHARA">BENDAHARA</option>
            <option value="KONTEN">KONTEN</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="user-password">
            Password {initial.id && '(kosongkan bila tidak diganti)'}
          </label>
          <input
            id="user-password"
            name="password"
            type="password"
            minLength={initial.id ? undefined : 8}
            required={!initial.id}
            className={fieldClass}
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-neutral-700">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={initial.isActive}
          className="h-4 w-4 rounded border-black/20"
        />
        Aktif
      </label>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
        >
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </button>
      </div>
    </form>
  )
}
