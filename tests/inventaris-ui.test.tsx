import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { InventoryMetrics } from '@/app/admin/(dashboard)/inventaris/InventoryMetrics'
import { InventarisTable } from '@/app/admin/(dashboard)/inventaris/InventarisTable'
import type { InventoryItem } from '@prisma/client'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/app/admin/(dashboard)/inventaris/actions', () => ({
  deleteInventoryItem: vi.fn().mockResolvedValue({ ok: true }),
  saveInventoryItem: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('InventoryMetrics', () => {
  it('merender keempat kartu metrik dengan benar', () => {
    render(
      <InventoryMetrics
        totalItems={12}
        totalAvailable={150}
        totalBorrowed={25}
        totalBroken={5}
      />,
    )

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/Total Jenis Barang/i)).toBeInTheDocument()
    expect(screen.getByText(/Siap Dipinjam/i)).toBeInTheDocument()
  })
})

describe('InventarisTable', () => {
  const dummyItems: InventoryItem[] = [
    {
      id: 'i-1',
      code: 'INV-TND-01',
      name: 'Tenda Kerucut 3x3',
      category: 'SARPRAS_UMUM',
      location: 'Gudang Belakang',
      isBorrowable: true,
      totalQty: 10,
      availableQty: 7,
      borrowedQty: 3,
      brokenQty: 0,
      isWaqf: true,
      waqfDonor: 'H. Suparman',
      priceEstimate: null,
      notes: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'i-2',
      code: 'INV-AUD-01',
      name: 'Mic Mimbar Utama',
      category: 'ELEKTRONIK_AUDIO',
      location: 'Ruang Audio',
      isBorrowable: false,
      totalQty: 2,
      availableQty: 2,
      borrowedQty: 0,
      brokenQty: 0,
      isWaqf: false,
      waqfDonor: null,
      priceEstimate: null,
      notes: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  it('merender baris tabel dengan kode, nama, dan badge ketersediaan', () => {
    render(<InventarisTable items={dummyItems} />)

    expect(screen.getByText('INV-TND-01')).toBeInTheDocument()
    expect(screen.getByText('Tenda Kerucut 3x3')).toBeInTheDocument()
    expect(screen.getByText(/H. Suparman/i)).toBeInTheDocument()
    expect(screen.getByText('Boleh Pinjam')).toBeInTheDocument()
    expect(screen.getByText('Internal')).toBeInTheDocument()
  })
})
