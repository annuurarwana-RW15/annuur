'use client'

import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

export interface LogoutButtonProps {
  user: { name: string; role: Role }
}

export function LogoutButton({ user }: LogoutButtonProps): React.JSX.Element {
  return (
    <div className="no-print flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <span className="mt-0.5 inline-block rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F5EFE2]">
          {user.role}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: '/admin/login' })}
        className="shrink-0 rounded-md border border-white/30 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
      >
        Keluar
      </button>
    </div>
  )
}
