import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Tracker } from '@/components/public/Tracker'

const state = vi.hoisted(() => ({ pathname: '/a' }))

vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
}))

function beaconPayload(call: unknown[]): Promise<{ path: string; referrer: string | null }> {
  const blob = call[1] as Blob
  return blob.text().then((text) => JSON.parse(text))
}

describe('Tracker', () => {
  let sendBeacon: ReturnType<typeof vi.fn>

  beforeEach(() => {
    state.pathname = '/a'
    sendBeacon = vi.fn()
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('mengirim beacon sekali saat mount dengan path & referrer', async () => {
    render(<Tracker />)

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon).toHaveBeenCalledWith('/api/track', expect.any(Blob))

    const [url, blob] = sendBeacon.mock.calls[0]
    expect(url).toBe('/api/track')
    expect((blob as Blob).type).toBe('application/json')
    expect(await beaconPayload(sendBeacon.mock.calls[0])).toEqual({
      path: '/a',
      referrer: document.referrer || null,
    })
  })

  it('mengirim beacon lagi setiap pathname berubah (navigasi SPA)', async () => {
    const { rerender } = render(<Tracker />)
    expect(sendBeacon).toHaveBeenCalledTimes(1)

    state.pathname = '/profil'
    rerender(<Tracker />)
    expect(sendBeacon).toHaveBeenCalledTimes(2)

    state.pathname = '/berita'
    rerender(<Tracker />)
    expect(sendBeacon).toHaveBeenCalledTimes(3)

    const paths = await Promise.all(sendBeacon.mock.calls.map((call) => beaconPayload(call).then((p) => p.path)))
    expect(paths).toEqual(['/a', '/profil', '/berita'])
  })

  it('tetap diam (tanpa throw) bila sendBeacon melempar error', () => {
    sendBeacon.mockImplementation(() => {
      throw new Error('boom')
    })

    expect(() => render(<Tracker />)).not.toThrow()
    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })
})
