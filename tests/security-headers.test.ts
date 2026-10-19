import { afterEach, describe, expect, it, vi } from 'vitest'

interface HeaderEntry {
  key: string
  value: string
}

interface RouteHeaders {
  source: string
  headers: HeaderEntry[]
}

interface NextConfigWithHeaders {
  headers?: () => Promise<RouteHeaders[]>
}

async function loadConfig(siteUrl: string): Promise<RouteHeaders[]> {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl)
  const mod = (await import('../next.config')) as { default: NextConfigWithHeaders }
  const routes = await mod.default.headers?.()
  if (!routes) throw new Error('next.config tidak mengekspor headers()')
  return routes
}

function headerMap(routes: RouteHeaders[]): Map<string, string> {
  const route = routes.find((r) => r.source === '/(.*)')
  if (!route) throw new Error('route catch-all (/(.*)) tidak ditemukan')
  return new Map(route.headers.map((h) => [h.key, h.value]))
}

describe('security headers di next.config', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('menempel di semua rute lewat pattern catch-all', async () => {
    const routes = await loadConfig('http://localhost:3000')
    expect(routes).toHaveLength(1)
    expect(routes[0].source).toBe('/(.*)')
  })

  it('mengirim header proteksi dasar', async () => {
    const headers = headerMap(await loadConfig('http://localhost:3000'))

    expect(headers.get('X-Frame-Options')).toBe('DENY')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none')
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  it('membatasi fitur perangkat yang tidak dipakai situs', async () => {
    const headers = headerMap(await loadConfig('http://localhost:3000'))
    const policy = headers.get('Permissions-Policy') ?? ''

    expect(policy).toContain('camera=()')
    expect(policy).toContain('microphone=()')
    expect(policy).toContain('geolocation=()')
  })

  it('mematikan auditor XSS yang sudah pensiun', async () => {
    const headers = headerMap(await loadConfig('http://localhost:3000'))
    expect(headers.get('X-XSS-Protection')).toBe('0')
  })

  it('TIDAK mengirim HSTS ke http (localhost)', async () => {
    const headers = headerMap(await loadConfig('http://localhost:3000'))
    expect(headers.has('Strict-Transport-Security')).toBe(false)
  })

  it('mengirim HSTS saat situs ber-https', async () => {
    const headers = headerMap(await loadConfig('https://annur.example.org'))

    expect(headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains',
    )
  })
})
