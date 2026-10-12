'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reorderSections } from './actions'

interface ReorderCellProps {
  id: string
  title: string
  orderedIds: string[]
  disabled?: boolean
}

const cellButtonClass =
  'rounded-md border border-black/10 bg-white px-2 py-1 text-xs leading-none text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40'

export function ReorderCell({ id, title, orderedIds, disabled = false }: ReorderCellProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const index = orderedIds.indexOf(id)

  async function move(delta: number) {
    const target = index + delta
    if (index < 0 || target < 0 || target >= orderedIds.length) return

    const next = [...orderedIds]
    next[index] = orderedIds[target]
    next[target] = orderedIds[index]

    setBusy(true)
    setError(null)
    try {
      const result = await reorderSections(next)
      if (!result.ok) setError(result.error ?? 'Gagal mengubah urutan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah urutan')
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  const off = disabled || busy

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label={`Naik ${title}`}
        disabled={off || index <= 0}
        onClick={() => move(-1)}
        className={cellButtonClass}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label={`Turun ${title}`}
        disabled={off || index < 0 || index >= orderedIds.length - 1}
        onClick={() => move(1)}
        className={cellButtonClass}
      >
        ▼
      </button>
      {error ? (
        <span role="alert" className="ml-1 text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  )
}
