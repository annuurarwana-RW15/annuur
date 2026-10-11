import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.setting.findUnique({ where: { key } })
    if (!row) return fallback
    const value = row.value
    if (typeof value !== 'string') return value as T
    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  } catch {
    return fallback
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const json = value as Prisma.InputJsonValue
  await db.setting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  })
}
