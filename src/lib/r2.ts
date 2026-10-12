import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ERROR = 'R2 belum dikonfigurasi: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, dan R2_BUCKET di .env'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${R2_ERROR} (kurang: ${name})`)
  return value
}

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client
  const accountId = requireEnv('R2_ACCOUNT_ID')
  requireEnv('R2_ACCESS_KEY_ID')
  requireEnv('R2_SECRET_ACCESS_KEY')
  requireEnv('R2_BUCKET')
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function r2Key(prefix: string, filename: string): string {
  const base = sanitizeFilename(filename)
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
    : ''
  const timestamp = Date.now()
  const rand = Math.random().toString(16).slice(2, 6).padEnd(4, '0')
  const name = ext ? `${base}.${ext}` : base
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${timestamp}-${rand}-${name}`
}

export function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL
  if (base) return `${base.replace(/\/+$/, '')}/${key}`
  const accountId = requireEnv('R2_ACCOUNT_ID')
  return `https://pub-${accountId}.r2.dev/${key}`
}

/**
 * Presigned PUT tanpa binding `Content-Length`/`Content-MD5` (rencana plan:
 * "validasi file saja" di route). Batas ukuran objek karena itu WAJIB di-set
 * sebagai bucket policy di R2 (mis. max object size 5MB untuk folder
 * `donations/`) — validasi `size` di route hanya permukaan, bukan pengaman
 * upload sesungguhnya.
 */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const bucket = requireEnv('R2_BUCKET')
  getClient()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client!, command, { expiresIn: 600 })
}
