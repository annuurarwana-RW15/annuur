import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DataTable, type Column, type DataTableProps } from '@/components/admin/DataTable'
import { PrintHeader } from '@/components/admin/PrintHeader'

interface Row {
  id: number
  nama: string
  nominal: number
}

const h = vi.hoisted(() => ({ replace: vi.fn(), url: '' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: h.replace }),
  useSearchParams: () => new URLSearchParams(h.url),
}))

const columns: Column<Row>[] = [
  { key: 'nama', label: 'Nama', sortable: true },
  { key: 'nominal', label: 'Nominal', align: 'right' },
]

const rows: Row[] = [
  { id: 1, nama: 'Zakat', nominal: 100000 },
  { id: 2, nama: 'Infaq', nominal: 50000 },
]

function renderTable(overrides: Partial<DataTableProps<Row>> = {}) {
  const props: DataTableProps<Row> = {
    columns,
    data: rows,
    total: 2,
    page: 1,
    pageSize: 20,
    basePath: '/admin/kas',
    ...overrides,
  }
  return render(<DataTable {...props} />)
}

afterEach(() => {
  cleanup()
  h.replace.mockReset()
  h.url = ''
  vi.useRealTimers()
})

describe('DataTable', () => {
  it('render 2 baris dan ringkasan "Menampilkan 1–2 dari 2"', () => {
    renderTable()
    expect(screen.getByText('Zakat')).toBeInTheDocument()
    expect(screen.getByText('Infaq')).toBeInTheDocument()
    expect(screen.getByText('Menampilkan 1–2 dari 2')).toBeInTheDocument()
  })

  it('search input tersedia', () => {
    renderTable({ searchPlaceholder: 'Cari nama…' })
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Cari nama…')).toBeInTheDocument()
  })

  it('tombol Export dan Print tersedia', () => {
    renderTable()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
  })

  it('hideBuiltinActions -> tombol Export & Print bawaan hilang, search tetap ada', () => {
    renderTable({ hideBuiltinActions: true })
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByText('Menampilkan 1–2 dari 2')).toBeInTheDocument()
  })

  it('pagination menampilkan total, nomor halaman, dan selector ukuran', () => {
    renderTable({ total: 45, page: 2, pageSize: 20 })
    expect(screen.getByText('Menampilkan 21–40 dari 45')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/admin/kas?page=3',
    )
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute(
      'href',
      '/admin/kas?page=1',
    )
    expect(screen.getByRole('combobox')).toHaveValue('20')
    expect(screen.getByRole('link', { name: 'Halaman sebelumnya' })).toHaveAttribute(
      'href',
      '/admin/kas?page=1',
    )
    expect(screen.getByRole('link', { name: 'Halaman berikutnya' })).toHaveAttribute(
      'href',
      '/admin/kas?page=3',
    )
  })

  it('data kosong → "Tidak ada data"', () => {
    renderTable({ data: [], total: 0 })
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument()
    expect(screen.queryByText('Zakat')).not.toBeInTheDocument()
  })

  it('header sortable merender link ?sort=&dir=asc', () => {
    renderTable()
    expect(screen.getByRole('link', { name: 'Nama' })).toHaveAttribute(
      'href',
      '/admin/kas?sort=nama&dir=asc',
    )
    expect(screen.getByText('Nominal')).toBeInTheDocument()
  })

  it('toggle sort: asc → desc → none, q & page dipertahankan', () => {
    h.url = 'q=s&page=2&sort=nama&dir=asc'
    const first = renderTable()
    expect(screen.getByRole('link', { name: 'Nama' })).toHaveAttribute(
      'href',
      '/admin/kas?q=s&page=2&sort=nama&dir=desc',
    )
    first.unmount()

    h.url = 'q=s&page=2&sort=nama&dir=desc'
    renderTable()
    expect(screen.getByRole('link', { name: 'Nama' })).toHaveAttribute(
      'href',
      '/admin/kas?q=s&page=2',
    )
  })

  it('search debounce 400ms → router.replace ?q=…&page=1', () => {
    vi.useFakeTimers()
    renderTable()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'za' } })
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(h.replace).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(h.replace).toHaveBeenCalledWith('/admin/kas?q=za&page=1')
  })

  it('tombol ✕ (muncul saat q terisi) menghapus q', () => {
    h.url = 'q=zakat'
    renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pencarian' }))
    expect(h.replace).toHaveBeenCalledWith('/admin/kas?page=1')
  })

  it('export CSV & Excel mengunduh blob dengan nama yang benar', async () => {
    const blobs: Blob[] = []
    const downloads: { name: string }[] = []
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return `blob:mock-${blobs.length}`
    })
    const revokeObjectURL = vi.fn()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ name: this.download })
      })
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    Object.assign(URL, { createObjectURL, revokeObjectURL })

    try {
      renderTable({ exportFilename: 'kas' })
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'CSV' }))
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Excel' }))

      expect(downloads).toEqual([{ name: 'kas.csv' }, { name: 'kas.xls' }])
      expect(blobs).toHaveLength(2)
      expect(blobs[1].type).toBe('application/vnd.ms-excel')

      const csv = await readBlob(blobs[0])
      const csvBytes = new Uint8Array(await readBlobBuffer(blobs[0]))
      expect([csvBytes[0], csvBytes[1], csvBytes[2]]).toEqual([0xef, 0xbb, 0xbf])
      expect(csv).toBe('Nama;Nominal\nZakat;100000\nInfaq;50000\n')

      const xls = await readBlob(blobs[1])
      expect(xls).toContain('<table')
      expect(xls).toContain('Zakat')
      expect(xls).toContain('100000')
      expect(createObjectURL).toHaveBeenCalledTimes(2)
      // Revoke sengaja ditunda. Memanggilnya sinkron setelah anchor.click()
      // dapat membatalkan unduhan karena browser belum sempat fetch blob-nya
      // — regresi yang ditangkap tests/e2e/jurnal-export.spec.ts.
      expect(revokeObjectURL).not.toHaveBeenCalled()
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    } finally {
      clickSpy.mockRestore()
      Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke })
    }
  })

  it('exportFilename kosong → fallback "export.csv"', async () => {
    const downloads: { name: string }[] = []
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ name: this.download })
      })
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    Object.assign(URL, { createObjectURL, revokeObjectURL })

    try {
      renderTable()
      fireEvent.click(screen.getByRole('button', { name: 'Export' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'CSV' }))
      expect(downloads).toEqual([{ name: 'export.csv' }])
    } finally {
      clickSpy.mockRestore()
      Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke })
    }
  })
})

describe('PrintHeader', () => {
  it('bersifat print-only, memuat judul, periode, dan tanggal cetak id-ID', () => {
    render(
      <PrintHeader title="Laporan Kas" subtitle="Periode Januari 2026" meta="Semua kategori" />,
    )
    expect(screen.getByText('Laporan Kas').closest('.print-only')).not.toBeNull()
    expect(screen.getByText('Periode Januari 2026')).toBeInTheDocument()
    expect(screen.getByText(/^Tanggal cetak:/)).toBeInTheDocument()
    expect(screen.getByText('Semua kategori')).toBeInTheDocument()
  })
})

function readBlob(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

async function readBlobBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}
