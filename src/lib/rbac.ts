import type { Role } from '@prisma/client'
import { redirect } from 'next/navigation'
import { auth, type SessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export type Action =
  | 'manage_users'
  | 'manage_settings'
  | 'manage_sections'
  | 'manage_articles'
  | 'manage_transactions'
  | 'verify_donations'
  | 'view_analytics'

const MATRIX: Record<Role, readonly Action[]> = {
  ADMIN: [
    'manage_users',
    'manage_settings',
    'manage_sections',
    'manage_articles',
    'manage_transactions',
    'verify_donations',
    'view_analytics',
  ],
  BENDAHARA: ['manage_transactions', 'verify_donations', 'view_analytics'],
  KONTEN: ['manage_sections', 'manage_articles'],
  VIEWER: ['view_analytics'],
}

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.includes(action) ?? false
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return null
  return { id: user.id, name: user.name ?? '', role: user.role }
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) redirect('/admin/login')

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, role: true, isActive: true },
  })
  if (!user || !user.isActive) throw new Error('Akses ditolak')
  if (!roles.includes(user.role)) throw new Error('Akses ditolak')

  return { id: user.id, name: user.name, role: user.role }
}
