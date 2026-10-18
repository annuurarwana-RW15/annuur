import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const h = vi.hoisted(() => ({
  /** Props tiap <Script> yang dirender layout, berurutan. */
  scripts: [] as Array<Record<string, unknown>>,
  ga4Id: '',
  sectionFindUnique: vi.fn(),
  getSetting: vi.fn(),
}))

vi.mock('@/lib/settings', () => ({ getSetting: h.getSetting }))

vi.mock('@/lib/db', () => ({
  db: { section: { findUnique: h.sectionFindUnique } },
}))

// Client component berat: hanya logika layout yang diuhi di sini.
vi.mock('@/components/public/Tracker', () => ({ Tracker: () => null }))
vi.mock('@/components/public/Footer', () => ({ Footer: () => null }))

// next/link & next/script butuh App Router context; diganti stub yang
// merekam props supaya bisa di-assert.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/script', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    h.scripts.push(props)
    return null
  },
}))

async function renderLayout(): Promise<string> {
  const { default: PublicLayout } = await import('@/app/(public)/layout')
  const element = await PublicLayout({ children: <main>isi konten</main> })
  return renderToStaticMarkup(element)
}

function htmlOf(script: Record<string, unknown>): string {
  const inner = script.dangerouslySetInnerHTML as { __html: string } | undefined
  return inner?.__html ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  h.scripts.length = 0
  h.ga4Id = ''
  h.sectionFindUnique.mockResolvedValue(null)
  h.getSetting.mockImplementation((key: string, fallback?: unknown) =>
    Promise.resolve(key === 'ga4.id' ? h.ga4Id : (fallback ?? '')),
  )
})

describe('GA4 di (public)/layout', () => {
  it('ID valid → dua <Script strategy="afterInteractive">: loader + config', async () => {
    h.ga4Id = 'G-ABC1234567'

    const html = await renderLayout()

    expect(h.scripts).toHaveLength(2)

    const [loader, config] = h.scripts
    expect(loader.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-ABC1234567')
    expect(loader.strategy).toBe('afterInteractive')
    expect(loader.id).toBeUndefined()

    expect(config.id).toBe('ga4')
    expect(config.strategy).toBe('afterInteractive')
    expect(htmlOf(config)).toContain("gtag('js', new Date())")
    expect(htmlOf(config)).toContain("gtag('config', 'G-ABC1234567')")

    // Layout tetap utuh: JSON-LD & konten tidak ikut hilang.
    expect(html).toContain('application/ld+json')
    expect(html).toContain('isi konten')
  })

  it('ID kosong → GA4 tidak dipasang sama sekali', async () => {
    h.ga4Id = ''

    const html = await renderLayout()

    expect(h.scripts).toHaveLength(0)
    expect(html).not.toContain('googletagmanager.com')
    expect(html).toContain('isi konten')
  })

  it('ID tidak berformat G-* → ditolak, tidak ada skrip yang dipasang', async () => {
    h.ga4Id = 'UA-12345-1'

    await renderLayout()

    expect(h.scripts).toHaveLength(0)
  })

  it('ID mengandung injeksi skrip → ditolak (guard regex, bukan string interp)', async () => {
    h.ga4Id = "');alert('xss');//"

    const html = await renderLayout()

    expect(h.scripts).toHaveLength(0)
    expect(html).not.toContain('alert(')
  })

  it('ID valid tapi berisi spasi di pinggir → di-trim dulu dipakai', async () => {
    h.ga4Id = '  G-TRIMMED1  '

    await renderLayout()

    expect(h.scripts).toHaveLength(2)
    expect(h.scripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-TRIMMED1',
    )
    expect(htmlOf(h.scripts[1])).toContain("gtag('config', 'G-TRIMMED1')")
  })
})
