import { describe, expect, it } from 'vitest'
import type { Role } from '@prisma/client'
import { type Action, can } from '@/lib/rbac'

const ALL_ACTIONS: Action[] = [
  'manage_users',
  'manage_settings',
  'manage_sections',
  'manage_articles',
  'manage_transactions',
  'verify_donations',
  'view_analytics',
]

const MATRIX: Record<Role, Action[]> = {
  ADMIN: ALL_ACTIONS,
  BENDAHARA: ['manage_transactions', 'verify_donations', 'view_analytics'],
  KONTEN: ['manage_sections', 'manage_articles'],
  VIEWER: ['view_analytics'],
}

describe('can(role, action)', () => {
  const cases = Object.entries(MATRIX) as [Role, Action[]][]
  for (const [role, allowed] of cases) {
    for (const action of ALL_ACTIONS) {
      const expected = allowed.includes(action)
      it(`${role} ${expected ? 'dapat' : 'tidak dapat'} ${action}`, () => {
        expect(can(role, action)).toBe(expected)
      })
    }
  }
})
