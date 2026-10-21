import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { buildDailyMonthSeries } from '@/lib/kas-daily'
import { getQris, parseQris } from '@/lib/qris'
import { FinanceSummary } from '@/components/public/FinanceSummary'

const h = vi.hoisted(() => ({ getSettingMock: vi.fn() }))

vi.mock('@/lib/settings', () => ({ getSetting: h.getSettingMock }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const DAILY = buildDailyMonthSeries([])

describe('parseQris', () => {
  it('mengembalikan null bila belum diisi / bentuk tidak valid', () => {
    expect(parseQris(null)).toBeNull()
    expect(parseQris(undefined)).toBeNull()
    expect(parseQris('https://cdn.example.com/q.png')).toBeNull()
    expect(parseQris({})).toBeNull()
    expect(parseQris({ image: '' })).toBeNull()
    expect(parseQris({ image: 123 })).toBeNull()
    expect(parseQris({ image: '  ' })).toBeNull()
  })

  it('menormalkan nilai valid: trim & caption opsional', () => {
    expect(parseQris({ image: ' https://cdn.example.com/q.png ' })).toEqual({
      image: 'https://cdn.example.com/q.png',
      caption: '',
    })
    expect(
      parseQris({
        image: 'https://cdn.example.com/q.png',
        caption: ' Masjid An-nuur Arwana ',
      }),
    ).toEqual({
      image: 'https://cdn.example.com/q.png',
      caption: 'Masjid An-nuur Arwana',
    })
  })
})

describe('getQris', () => {
  it('membaca key donasi.qris dan mengembalikan null bila tidak ada', async () => {
    h.getSettingMock.mockResolvedValue(null)

    await expect(getQris()).resolves.toBeNull()
    expect(h.getSettingMock).toHaveBeenCalledWith('donasi.qris', null)
  })

  it('mengembalikan data ternormalisasi dari penyimpanan', async () => {
    h.getSettingMock.mockResolvedValue({
      image: 'https://cdn.example.com/qris.png',
      caption: 'DKM An-nuur',
    })

    await expect(getQris()).resolves.toEqual({
      image: 'https://cdn.example.com/qris.png',
      caption: 'DKM An-nuur',
    })
  })
})

describe('FinanceSummary — kartu QRIS', () => {
  it('menampilkan kartu compact: gambar QR + judul + keterangan', () => {
    render(
      <FinanceSummary
        saldo={150000}
        daily={DAILY}
        qris={{
          image: 'https://cdn.example.com/qris.png',
          caption: 'Masjid An-nuur Arwana',
        }}
      />,
    )

    const img = screen.getByAltText('Kode QRIS donasi')
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/qris.png')

    const card = img.closest('figure')
    expect(card).not.toBeNull()
    const figcaption = within(card as HTMLElement)
    expect(figcaption.getByText('Donasi via QRIS')).toBeInTheDocument()
    expect(
      figcaption.getByText('Masjid An-nuur Arwana'),
    ).toBeInTheDocument()
  })

  it('kartu tanpa keterangan tetap tampil (hanya judul)', () => {
    render(
      <FinanceSummary
        saldo={null}
        daily={DAILY}
        qris={{ image: 'https://cdn.example.com/qris.png', caption: '' }}
      />,
    )

    expect(screen.getByAltText('Kode QRIS donasi')).toBeInTheDocument()
    expect(screen.getByText('Donasi via QRIS')).toBeInTheDocument()
    expect(screen.queryByText('Pindai untuk berdonasi')).toBeInTheDocument()
  })

  it('tanpa qris → kartu tidak dirender sama sekali', () => {
    render(<FinanceSummary saldo={1000} daily={DAILY} qris={null} />)

    expect(screen.queryByText('Donasi via QRIS')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Kode QRIS donasi')).not.toBeInTheDocument()
  })
})
