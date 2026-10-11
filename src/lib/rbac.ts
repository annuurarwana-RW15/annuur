import type { Role } from '@prisma/client'

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
