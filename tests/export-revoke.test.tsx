import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { LaporanTable } from '@/app/admin/(dashboard)/kas/laporan/LaporanTable'
import { JurnalTable } from '@/app/admin/(dashboard)/kas/laporan/JurnalTable'

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  exportKasReport: vi.fn(),
  exportJurnal: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: h.replace }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/app/admin/(dashboard)/kas/laporan/actions', () => ({
  exportKasReport: h.exportKasReport,
  exportJurnal: h.exportJurnal,
}))

const KAS_ROWS = [
  { kategori: 'Infak', masuk: 150000, keluar: 0, saldo: 150000 },
  { kategori: 'Sosial', masuk: 0, keluar: 25000, saldo: -25000 },
]

const JURNAL_ROWS = [
  {
    id: 't1',
    no: 1,
    tanggal: new Date('2026-10-01'),
    description: 'Infak jamaah',
    kategoriId: 'c-infak',
    kategori: 'Infak',
    jenis: 'MASUK' as const,
    masuk: 150000,
    keluar: 0,
    saldo: 150000,
  },
]

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

interface UrlMock {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  restore: () => void
}

function mockObjectUrls(): UrlMock {
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  Object.assign(URL, { createObjectURL, revokeObjectURL })
  return {
    createObjectURL,
    revokeObjectURL,
    restore: () => Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke }),
  }
}

/**
 * Kunci perilaku revoke: object URL hanya dicabut SETELAH jeda, bukan sinkron
 * setelah `anchor.click()`. Mencabutnya sinkron membatalkan unduhan di
 * sebagian browser karena browser belum sempat fetch blob-nya.
 */
async function expectDeferredRevoke(label: string) {
  const url = mockObjectUrls()
  vi.useFakeTimers()
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined)

  try {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: label }))
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(url.createObjectURL).toHaveBeenCalledTimes(1)

    // 1ms setelah klik: revoke SUDAH dipanggil = regresi (sinkron).
    expect(url.revokeObjectURL).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(url.revokeObjectURL).toHaveBeenCalledTimes(1)
  } finally {
    clickSpy.mockRestore()
    url.restore()
  }
}

describe('unduhan ekspor tidak dibatalkan (revoke ditunda)', () => {
  it('LaporanTable — Ekspor CSV', async () => {
    h.exportKasReport.mockResolvedValue({
      ok: true,
      filename: 'laporan-kas-2026.csv',
      content: 'Kategori;Masuk;Keluar;Saldo\n',
      mime: 'text/csv',
    })
    render(
      <LaporanTable rows={KAS_ROWS} total={2} page={1} pageSize={20} periodId="p-2026" />,
    )
    await expectDeferredRevoke('Ekspor CSV')
    expect(h.exportKasReport).toHaveBeenCalledWith('csv', {
      periodId: 'p-2026',
    })
  })

  it('LaporanTable — Ekspor Excel', async () => {
    h.exportKasReport.mockResolvedValue({
      ok: true,
      filename: 'laporan-kas-2026.xls',
      content: '<table></table>',
      mime: 'application/vnd.ms-excel',
    })
    render(
      <LaporanTable rows={KAS_ROWS} total={2} page={1} pageSize={20} periodId="p-2026" />,
    )
    await expectDeferredRevoke('Ekspor Excel')
  })

  it('JurnalTable — Ekspor CSV', async () => {
    h.exportJurnal.mockResolvedValue({
      ok: true,
      filename: 'jurnal-kas-2026.csv',
      content: 'No;Tanggal;Saldo\n',
      mime: 'text/csv',
    })
    render(
      <JurnalTable
        rows={JURNAL_ROWS}
        total={1}
        page={1}
        pageSize={20}
        periodId="p-2026"
        filter={{}}
      />,
    )
    await expectDeferredRevoke('Ekspor CSV')
    expect(h.exportJurnal).toHaveBeenCalledWith('csv', {
      periodId: 'p-2026',
      filter: {},
    })
  })

  it('JurnalTable — Ekspor Excel', async () => {
    h.exportJurnal.mockResolvedValue({
      ok: true,
      filename: 'jurnal-kas-2026.xls',
      content: '<table></table>',
      mime: 'application/vnd.ms-excel',
    })
    render(
      <JurnalTable
        rows={JURNAL_ROWS}
        total={1}
        page={1}
        pageSize={20}
        periodId="p-2026"
        filter={{}}
      />,
    )
    await expectDeferredRevoke('Ekspor Excel')
  })

  it('ekspor gagal → tidak ada blob dibuat, revoke tidak dipanggil', async () => {
    h.exportKasReport.mockResolvedValue({ ok: false, error: 'Akses ditolak' })
    const url = mockObjectUrls()
    vi.useFakeTimers()
    render(
      <LaporanTable rows={KAS_ROWS} total={2} page={1} pageSize={20} periodId="p-2026" />,
    )

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Ekspor CSV' }))
        await vi.advanceTimersByTimeAsync(250)
      })
      expect(url.createObjectURL).not.toHaveBeenCalled()
      expect(url.revokeObjectURL).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('Akses ditolak')
    } finally {
      url.restore()
    }
  })
})
