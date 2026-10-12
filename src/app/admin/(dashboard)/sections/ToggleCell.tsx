'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleSection } from './actions'

interface ToggleCellProps {
  id: string
  title: string
  visible: boolean
}

export function ToggleCell({ id, title, visible }: ToggleCellProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      await toggleSection(id, next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status')
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={`Tampilkan section ${title}`}
        disabled={busy}
        onClick={() => handleChange(!visible)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
          visible ? 'bg-green-800' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            visible ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="whitespace-nowrap text-xs text-neutral-500">
        {visible ? 'Tampil' : 'Sembunyi'}
      </span>
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  )
}
