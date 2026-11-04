import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  AcquisitionTable,
  type AcquisitionItemRow,
} from '@/app/admin/(dashboard)/inventaris/pengadaan/AcquisitionTable'
import { AcquisitionModal } from '@/app/admin/(dashboard)/inventaris/pengadaan/AcquisitionModal'

afterEach(cleanup)

const mockCreateAcquisition = vi.fn().mockResolvedValue({ ok: true })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/app/admin/(dashboard)/inventaris/actions', () => ({
  createAcquisition: (...args: unknown[]) => mockCreateAcquisition(...args),
}))

describe('AcquisitionTable', () => {
  const dummyItems = [
    { id: 'it-1', code: 'INV-TND-01', name: 'Tenda Kerucut', totalQty: 5 },
    { id: 'it-2', code: 'INV-MIC-01', name: 'Mic Wireless', totalQty: 2 },
  ]

  const dummyCategories = [
    { id: 'cat-1', name: 'Operasional Sarpras' },
  ]

  const dummyAcquisitions: AcquisitionItemRow[] = [
    {
      id: 'acq-1',
      date: new Date('2026-11-01'),
      quantity: 5,
      source: 'PEMBELIAN_KAS',
      unitPrice: 500000,
      donorName: null,
      officer: 'Ust. Fulan',
      notes: 'Beli di Toko Barokah',
      item: { id: 'it-1', code: 'INV-TND-01', name: 'Tenda Kerucut' },
      transaction: { id: 'tx-12345678', amount: 2500000 },
    },
    {
      id: 'acq-2',
      date: new Date('2026-11-02'),
      quantity: 2,
      source: 'WAKAF_HIBAH',
      unitPrice: null,
      donorName: 'H. Soleh',
      officer: 'Pak RT',
      notes: 'Hibah untuk pengajian',
      item: { id: 'it-2', code: 'INV-MIC-01', name: 'Mic Wireless' },
      transaction: null,
    },
  ]

  it('merender daftar pengadaan dengan badge sumber dan nominal/donatur', () => {
    render(
      <AcquisitionTable
        acquisitions={dummyAcquisitions}
        items={dummyItems}
        cashCategories={dummyCategories}
      />,
    )

    expect(screen.getByText('Tenda Kerucut')).toBeInTheDocument()
    expect(screen.getByText('INV-TND-01')).toBeInTheDocument()
    expect(screen.getAllByText('Pembelian Kas').length).toBeGreaterThan(0)
    expect(screen.getByText('+5 unit')).toBeInTheDocument()
    expect(screen.getByText('Ust. Fulan')).toBeInTheDocument()
    expect(screen.getByText(/Kas Keluar #345678/i)).toBeInTheDocument()

    expect(screen.getByText('Mic Wireless')).toBeInTheDocument()
    expect(screen.getAllByText('Wakaf / Hibah').length).toBeGreaterThan(0)
    expect(screen.getByText('+2 unit')).toBeInTheDocument()
    expect(screen.getByText('H. Soleh')).toBeInTheDocument()
  })

  it('dapat memfilter baris berdasarkan teks pencarian', () => {
    render(
      <AcquisitionTable
        acquisitions={dummyAcquisitions}
        items={dummyItems}
        cashCategories={dummyCategories}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/Cari barang, petugas, donatur.../i)
    fireEvent.change(searchInput, { target: { value: 'Soleh' } })

    expect(screen.getByText('Mic Wireless')).toBeInTheDocument()
    expect(screen.queryByText('Tenda Kerucut')).not.toBeInTheDocument()
  })

  it('dapat membuka modal saat tombol tambah diklik', () => {
    render(
      <AcquisitionTable
        acquisitions={dummyAcquisitions}
        items={dummyItems}
        cashCategories={dummyCategories}
      />,
    )

    const addBtn = screen.getByRole('button', { name: /\+ Catat Pengadaan Baru/i })
    fireEvent.click(addBtn)

    expect(
      screen.getByText(/Catat Pengadaan \/ Penambahan Stok/i),
    ).toBeInTheDocument()
  })
})

describe('AcquisitionModal', () => {
  const dummyItems = [
    { id: 'it-1', code: 'INV-TND-01', name: 'Tenda Kerucut', totalQty: 5 },
  ]
  const dummyCategories = [
    { id: 'cat-1', name: 'Operasional Sarpras' },
  ]

  it('dapat mengirimkan data pengadaan dan memanggil createAcquisition', async () => {
    const handleClose = vi.fn()
    render(
      <AcquisitionModal
        items={dummyItems}
        cashCategories={dummyCategories}
        onClose={handleClose}
      />,
    )

    const officerInput = screen.getByPlaceholderText(/Nama Pengurus DKM/i)
    fireEvent.change(officerInput, { target: { value: 'Ahmad PIC' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Pengadaan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateAcquisition).toHaveBeenCalledTimes(1)
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })
})
