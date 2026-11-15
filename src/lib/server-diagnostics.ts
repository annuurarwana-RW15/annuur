import path from 'node:path'
import { promises as fs } from 'node:fs'
import { db } from './db'

export interface ServerDiagnosticsData {
  database: {
    status: 'connected' | 'disconnected'
    latencyMs: number
    error?: string
  }
  storage: {
    totalBytes: number
    totalFiles: number
    formattedSize: string
  }
  runtime: {
    nodeVersion: string
    env: string
    uptimeSeconds: number
    uptimeFormatted: string
    memory: {
      heapUsedMb: number
      heapTotalMb: number
      rssMb: number
    }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(2)} ${units[i]}`
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (d > 0) parts.push(`${d} hari`)
  if (h > 0 || d > 0) parts.push(`${h} jam`)
  if (m > 0 || h > 0 || d > 0) parts.push(`${m} menit`)
  parts.push(`${s} detik`)
  return parts.join(' ')
}

async function getDirStats(dirPath: string): Promise<{ totalBytes: number; totalFiles: number }> {
  let totalBytes = 0
  let totalFiles = 0

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const sub = await getDirStats(fullPath)
        totalBytes += sub.totalBytes
        totalFiles += sub.totalFiles
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath)
          totalBytes += stat.size
          totalFiles += 1
        } catch {
          // Abaikan jika file tidak dapat diakses
        }
      }
    }
  } catch {
    // Jika folder belum ada
  }

  return { totalBytes, totalFiles }
}

export async function getServerDiagnostics(): Promise<ServerDiagnosticsData> {
  // 1. Database Ping
  let dbStatus: 'connected' | 'disconnected' = 'connected'
  let dbLatency = 0
  let dbError: string | undefined

  const start = performance.now()
  try {
    await db.$queryRawUnsafe('SELECT 1')
    dbLatency = Math.round(performance.now() - start)
  } catch (err) {
    dbStatus = 'disconnected'
    dbLatency = Math.round(performance.now() - start)
    dbError = err instanceof Error ? err.message : 'Koneksi database terputus'
  }

  // 2. Storage Uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const { totalBytes, totalFiles } = await getDirStats(uploadsDir)

  // 3. Runtime & Memory
  const mem = process.memoryUsage()
  const uptime = process.uptime()

  return {
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      error: dbError,
    },
    storage: {
      totalBytes,
      totalFiles,
      formattedSize: formatBytes(totalBytes),
    },
    runtime: {
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    },
  }
}
