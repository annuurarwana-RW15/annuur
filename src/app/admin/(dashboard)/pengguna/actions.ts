'use server'

import { hash } from 'bcryptjs'
import type { Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export interface SaveUserInput {
  id?: string
  name: string
  email: string
  role: Role
  password?: string
  isActive: boolean
}

export async function saveUser(
  data: SaveUserInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole('ADMIN')

  const sessionUser = await auth()
  if (data.id && sessionUser?.user?.id === data.id && !data.isActive) {
    return { ok: false, error: 'Tidak bisa nonaktifkan diri sendiri' }
  }

  try {
    if (data.id) {
      await db.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          ...(data.password ? { passwordHash: await hash(data.password, 10) } : {}),
        },
      })
    } else {
      if (!data.password) {
        return { ok: false, error: 'Password wajib diisi untuk pengguna baru' }
      }
      await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          passwordHash: await hash(data.password, 10),
        },
      })
    }
    return { ok: true }
  } catch (error) {
    console.error(error)
    const code = (error as { code?: string }).code
    if (code === 'P2002') {
      return { ok: false, error: 'Email sudah terdaftar' }
    }
    return { ok: false, error: 'Gagal menyimpan pengguna' }
  }
}
